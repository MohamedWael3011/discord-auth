const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    discordID: { type: String, required: true, unique: true },
    maticAddress: { type: String, required: true, unique: true },
    stakedTokenIds: { type: [String], default: [] },
    coinsBalance: Number,
    bankBalance: Number,
    bankDateUpdate: Date,
});

const User = mongoose.model('User', userSchema);

module.exports = User;