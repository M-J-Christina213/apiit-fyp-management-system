const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");


// ===============================
// GET ALL SUPERVISORS
// ===============================
const getSupervisors = async (req, res) => {
    try {

        const supervisors = await prisma.supervisors.findMany({
            include: {
                student_fyp_records: true
            }
        });


        const formatted = supervisors.map(s => {

            const confirmedRecords = s.student_fyp_records.filter(r =>
                r.supervisor_confirmation_status === "Confirmed" ||
                r.supervisor_confirmation_status === "Allocated"
            );


            const usedSlots = confirmedRecords.length;

            const availableSlots = Math.max(
                0,
                s.preferred_supervision_slots - usedSlots
            );


            return {
                id: s.id,
                title: s.title,
                name: s.name,
                email: s.email,
                expertise: s.expertise,
                research_interests: s.research_interests,
                additional_information: s.additional_information,
                preferred_supervision_slots: s.preferred_supervision_slots,
                signature_url: s.signature_url,
                availableSlots,
                status: availableSlots > 0 ? "Available" : "Full"
            };

        });


        res.json(formatted);


    } catch (error) {

        console.error("Failed to fetch supervisors:", error);

        res.status(500).json({
            message: "Failed to fetch supervisors"
        });

    }
};




// ===============================
// CREATE SINGLE SUPERVISOR
// ===============================
const createSupervisor = async (req, res) => {

    try {

        const {
            title,
            name,
            email,
            expertise,
            research_interests,
            additional_information,
            preferred_supervision_slots

        } = req.body;



        const normEmail = String(email || "").trim().toLowerCase();

        // Check if supervisor profile already exists
        const existingSup = await prisma.supervisors.findFirst({
            where: { email: { equals: normEmail, mode: "insensitive" } }
        });

        let newSupervisor;
        if (existingSup) {
            newSupervisor = await prisma.supervisors.update({
                where: { id: existingSup.id },
                data: {
                    title: title || existingSup.title,
                    name: name || existingSup.name,
                    expertise: expertise || existingSup.expertise,
                    research_interests: research_interests || existingSup.research_interests,
                    additional_information: additional_information || existingSup.additional_information,
                    preferred_supervision_slots: preferred_supervision_slots ? parseInt(preferred_supervision_slots, 10) : existingSup.preferred_supervision_slots
                }
            });
        } else {
            newSupervisor = await prisma.supervisors.create({
                data: {
                    title,
                    name,
                    email: normEmail,
                    expertise,
                    research_interests,
                    additional_information,
                    preferred_supervision_slots: Math.max(3, parseInt(preferred_supervision_slots, 10) || 3)
                }
            });
        }

        // Create or update login account with SUPERVISOR role
        const existingUser = await prisma.users.findFirst({
            where: { email: { equals: normEmail, mode: "insensitive" } }
        });

        if (existingUser) {
            const currentRole = existingUser.role.toUpperCase();
            if (currentRole === "PM" || currentRole === "ADMIN") {
                return res.status(400).json({
                    error: "Role Conflict",
                    message: `This email is already registered as ${currentRole}. Please resolve the existing role before assigning as a Supervisor.`
                });
            }
            // Update to SUPERVISOR if it wasn't
            if (currentRole !== "SUPERVISOR") {
                await prisma.users.update({
                    where: { id: existingUser.id },
                    data: { role: "SUPERVISOR", name: name || existingUser.name }
                });
            }
        } else {
            await prisma.users.create({
                data: {
                    name,
                    email: normEmail,
                    password: bcrypt.hashSync("123@abc", 10),
                    role: "SUPERVISOR",
                    is_active: true
                }
            });
        }



        res.status(201).json(newSupervisor);



    } catch (error) {

        console.error(
            "Failed to create supervisor:",
            error
        );


        res.status(500).json({
            message: "Failed to create supervisor"
        });

    }

};





// ===============================
// UPLOAD SUPERVISORS FROM EXCEL
// ===============================
const uploadSupervisors = async (req, res) => {


    try {


        const importedSupervisors = req.body;


        let count = 0;



        // Insert / Update supervisors table
        for (const sup of importedSupervisors) {


            await prisma.supervisors.upsert({

                where: {
                    email: sup.email
                },


                update: {

                    title: sup.title,

                    name: sup.name,

                    expertise: sup.expertise,

                    research_interests:
                        sup.research_interests,

                    additional_information:
                        sup.additional_information,


                    preferred_supervision_slots: Math.max(3, parseInt(sup.preferred_supervision_slots, 10) || 3)

                }

            });


            count++;

        }





        // Create system login accounts
        for (const sup of importedSupervisors) {


            const existingUser =
                await prisma.users.findUnique({

                    where: {
                        email: sup.email
                    }

                });



            if (!existingUser) {


                await prisma.users.create({

                    data: {

                        email: sup.email,


                        password:
                            bcrypt.hashSync(
                                "123@abc",
                                10
                            ),


                        role: "supervisor",


                        is_active: true

                    }

                });


            }


        }





        res.json({

            message:
                "Supervisors uploaded successfully",

            count

        });



    } catch (error) {


        console.error(
            "Failed to upload supervisors:",
            error
        );


        res.status(500).json({

            message:
                "Failed to upload supervisors"

        });


    }

};





// ===============================
// CLEAR ALL SUPERVISORS
// ===============================
const clearAllSupervisors = async (req, res) => {
    try {

        // Get supervisor emails before deleting
        const supervisors = await prisma.supervisors.findMany({
            select: {
                email: true
            }
        });


        const supervisorEmails = supervisors.map(
            s => s.email
        );


        // Delete supervisor records
        await prisma.supervisors.deleteMany({});


        // Delete supervisor login accounts
        await prisma.users.deleteMany({
            where: {
                email: {
                    in: supervisorEmails
                },
                role: "supervisor"
            }
        });


        res.json({
            message:
                "All supervisors and their login accounts cleared successfully"
        });


    } catch (error) {

        console.error(
            "Failed to clear supervisors:",
            error
        );


        res.status(500).json({
            message:
                "Failed to clear supervisors"
        });

    }
};





// ===============================
// UPDATE SUPERVISOR
// ===============================
const updateSupervisor = async (req, res) => {


    try {


        const { id } = req.params;


        const {
            title,
            name,
            email,
            expertise,
            research_interests,
            additional_information,
            preferred_supervision_slots

        } = req.body;




        const updated = await prisma.supervisors.update({

            where: {

                id:
                    parseInt(id, 10)

            },


            data: {


                title,

                name,

                email,

                expertise,

                research_interests,

                additional_information,


                preferred_supervision_slots: Math.max(3, parseInt(preferred_supervision_slots, 10) || 3)

            }

        });



        res.json(updated);



    } catch (error) {


        console.error(
            "Failed to update supervisor:",
            error
        );


        res.status(500).json({

            message:
                "Failed to update supervisor"

        });


    }

};






// ===============================
// DELETE SUPERVISOR
// ===============================
const deleteSupervisor = async (req, res) => {


    try {


        const { id } = req.params;



        await prisma.supervisors.delete({

            where: {
                id:
                    parseInt(id, 10)
            }

        });



        res.json({

            message:
                "Supervisor deleted successfully"

        });



    } catch (error) {


        console.error(
            "Failed to delete supervisor:",
            error
        );


        res.status(500).json({

            message:
                "Failed to delete supervisor"

        });


    }

};






module.exports = {

    getSupervisors,

    createSupervisor,

    uploadSupervisors,

    clearAllSupervisors,

    updateSupervisor,

    deleteSupervisor

};