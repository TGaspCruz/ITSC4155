const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
  username: {
    type: String,
    required: [true, "Please enter username"],
  },

  email: {
    type: String,
    required: [true, "Please enter email"],
    unique: true,
    match: [/.+@.+\..+/, "Please enter a valid email address"],
  },

        password: {
            type: String,
            required: [true, "Please enter password"],
            minlength: [8, 'Password must be at least 8 characters']
        }
        ,
        portfolio: {
            availableFunds: {
                type: Number,
                default: 0,
                required: true,
            },
            stocks: [
                {
                    ticker: { type: String, required: true },
                    quantity: { type: Number, required: true, min: 0 },
                    avgPrice: { type: Number, required: true, min: 0 }
                }
            ]
        }
    }
);

const User = mongoose.model("User", UserSchema);

module.exports = User;
