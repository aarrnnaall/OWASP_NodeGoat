var bcrypt = require("bcrypt-nodejs");

/* The UserDAO must be constructed with a connected database object */
function UserDAO(db) {

    "use strict";

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object. Log a warning and call it correctly. */
    if (false === (this instanceof UserDAO)) {
        console.log("Warning: UserDAO constructor called without 'new' operator");
        return new UserDAO(db);
    }

    var usersCol = db.collection("users");

    this.addUser = function(userName, firstName, lastName, password, email, callback) {

        //A2-1 - Broken Auth
        var salt = bcrypt.genSaltSync();
        var passwordHash = bcrypt.hashSync(password, salt);

        var user = {
            userName: userName,
            firstName: firstName,
            lastName: lastName,
            benefitStartDate: this.getRandomFutureDate(),
            //A2-1 - Broken Auth

            password: passwordHash

        };

        // Add email if set
        if (email !== "") {
            user.email = email;
        }

        this.getNextSequence("userId", function(err, id) {
            if (err) {
                return callback(err, null);
            }
            console.log(typeof(id));

            user._id = id;

            usersCol.insert(user, function(err, result) {

                if (!err) {
                    return callback(null, result.ops[0]);
                }

                return callback(err, null);
            });
        });
    };

    this.getRandomFutureDate = function() {
        var today = new Date();
        var day = (Math.floor(Math.random() * 10) + today.getDay()) % 29;
        var month = (Math.floor(Math.random() * 10) + today.getMonth()) % 12;
        var year = Math.ceil(Math.random() * 30) + today.getFullYear();
        return year + "-" + ("0" + month).slice(-2) + "-" + ("0" + day).slice(-2);
    };
    this.validateLogin = function(userName, password, callback) {

        function validateUserDoc(err, user) {

            if (err) return callback(err, null);

            if (user) {
                // Fix for A2-Broken Auth
                if (bcrypt.compareSync(password, user.password)) {
                    callback(null, user);
                } else {
                    var invalidPasswordError = new Error("Invalid password");
                    invalidPasswordError.invalidPassword = true;
                    callback(invalidPasswordError, null);
                }
            } else {
                var noSuchUserError = new Error("User: " + user + " does not exist");
                noSuchUserError.noSuchUser = true;
                callback(noSuchUserError, null);
            }
        }

        users.findOne({
            userName: userName
        }, validateUserDoc);
    };

    this.getUserById = function(userId, callback) {
        usersCol.findOne({
            _id: parseInt(userId)
        }, callback);
    };

    this.getUserByUserName = function(userName, callback) {
        usersCol.findOne({
            userName: userName
        }, callback);
    };

    this.getNextSequence = function(name, callback) {
        db.collection("counters").findAndModify({
                _id: name
            }, [], {
                $inc: {
                    seq: 1
                }
            }, {
                new: true
            },
            function(err, data) {
                if (err) {
                    return callback(err, null);
                }
                callback(null, data.value.seq);
            }
        );
    };
}

module.exports.UserDAO = UserDAO;
