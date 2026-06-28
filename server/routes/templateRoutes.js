const express = require("express");
const multer = require("multer");
const path = require("path");

const {

    getTemplates,
    uploadTemplate,
    downloadTemplate,
    deleteTemplate,
    updateTemplate,
    viewTemplate

} = require("../controllers/templateController");


const router = express.Router();

// Multer storage

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(null, "uploads/templates");

    },

    filename: (req, file, cb) => {

        cb(

            null,

            Date.now() + path.extname(file.originalname)

        );

    }

});

const upload = multer({
    storage
});

router.get("/", getTemplates);

router.post(

    "/upload",

    upload.single("file"),

    uploadTemplate

);

router.get(

    "/download/:id",

    downloadTemplate

);

router.delete(

    "/:id",

    deleteTemplate

);

router.patch("/:id", updateTemplate);

router.get("/view/:id", viewTemplate);

module.exports = router;