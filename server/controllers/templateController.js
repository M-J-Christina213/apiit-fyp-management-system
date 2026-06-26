const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const path = require("path");
const fs = require("fs");

// Get all templates
const getTemplates = async (req, res) => {
    try {

        const templates = await prisma.templates.findMany({
            orderBy: {
                uploaded_at: "desc"
            }
        });

        res.json(templates);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to fetch templates"
        });

    }
};

// Upload template
const uploadTemplate = async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded."
            });
        }

        const template = await prisma.templates.create({

            data: {

                title: req.body.title,

                file_name: req.file.originalname,

                file_type: path.extname(req.file.originalname),

                file_size: `${(req.file.size / 1024).toFixed(2)} KB`,

                file_path: req.file.filename

            }

        });

        res.status(201).json(template);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Upload failed."
        });

    }

};

// Download template
const downloadTemplate = async (req, res) => {

    try {

        const template = await prisma.templates.findUnique({
            where: {
                id: Number(req.params.id)
            }
        });

        if (!template) {

            return res.status(404).json({
                message: "Template not found."
            });

        }

        const filePath = path.join(
            __dirname,
            "../uploads/templates",
            template.file_path
        );

        res.download(filePath, template.file_name);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Download failed."
        });

    }

};

// Delete template
const deleteTemplate = async (req, res) => {

    try {

        const template = await prisma.templates.findUnique({
            where: {
                id: Number(req.params.id)
            }
        });

        if (!template) {

            return res.status(404).json({
                message: "Template not found."
            });

        }

        const filePath = path.join(
            __dirname,
            "../uploads/templates",
            template.file_path
        );

        if (fs.existsSync(filePath)) {

            fs.unlinkSync(filePath);

        }

        await prisma.templates.delete({
            where: {
                id: Number(req.params.id)
            }
        });

        res.json({
            message: "Template deleted."
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Delete failed."
        });

    }

};

module.exports = {

    getTemplates,
    uploadTemplate,
    downloadTemplate,
    deleteTemplate

};