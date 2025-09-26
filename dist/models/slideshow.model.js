"use strict";
const { mongoose } = require('../config/db.config');
const slideshowSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    img: {
        type: String,
        required: true,
    },
    desc: {
        type: String,
    },
}, { timestamps: true });
const SlideshowSchema = mongoose.model('slideshow', slideshowSchema);
module.exports = SlideshowSchema;
