fm.Package("com.anoop.model");
const uniqid = require('uniqid');
const token_model = require('../../../../models/tokeno');
fm.Import("...jeet.memdb.RedisDB");
fm.Import(".User")
let jwt = require("jsonwebtoken");
fm.Class("Token>.BaseModel", function (me, RedisDB, User) {
    this.setMe = _me => me = _me;

    Static.create = async function(user){
        let token = await token_model.findOne({ user_id: user._id }).exec();

        if(token) return {
            tokenid: token.token,
            user: user
        }

        var token_uniqueid = uniqid() + uniqid() + uniqid()+ uniqid()+ uniqid();
        var tokmodel = new token_model({
            "user_id": user._id,
            "token": token_uniqueid,
            "created_at": new Date()
        });
        await tokmodel.save().catch(err => {
            console.error   (err.message, err.stack);
        });
        return {
            "tokenid": token_uniqueid,
            "user": user
        };
    };

    Static.getUserByToken = async function (token){
        let user_id = await RedisDB.base.getData("t_"+token);
        if(user_id) {
            return await User.getRedisUser(user_id);
        }
        token = await token_model.findOne({ "token": token }).exec();
        if(!token) {
            return null;
        }
        await RedisDB.base.setData("t_"+token.token, token.user_id.toHexString());  
        RedisDB.base.setExpire("t_"+token.token, 60*60*1000);
        return await User.getRedisUser(token.user_id.toHexString());      
    };

        
    Static.createTokenWeb = async function (user, ipaddress) {
        let token = await me.generateJWTToken({ user_id: user._id, email: user.email });
        new token_model({
            refresh_token: token.refreshToken,
            user_id: user._id,
            last_used_at: new Date(),
            ipaddress: ipaddress || ''
        }).save();
        
        return {
            token: token,
            user: {
                email: user.email,
                email_client: user.email_client,
                primary_email: user.primary_email,
            }
        }
    }


    let private_refresh_key;
    Static.generateJWTToken = async (user) => {
        private_refresh_key = private_refresh_key || process.env.LOGIN_REFRESH_PRIVATE_KEY || require("fs").readFileSync(global.basedir+"/"+ process.env.JWT_REFRESH_TOKEN_SECRET_FILE+"private.pem");
        let fiveHoursLater = new Date(new Date().setHours(new Date().getHours() + 1)).toString();
        return {
            "accessToken": jwt.sign(user, process.env.JWT_ACCESS_TOKEN_SECRET_KEY, { expiresIn: '1hr'}),
            "refreshToken": jwt.sign(user, private_refresh_key, { expiresIn: '720hr',algorithm: 'RS256'}),
            "accessTokenExpireTime": fiveHoursLater
        }
    }
});

