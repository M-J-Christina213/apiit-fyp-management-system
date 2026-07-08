const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();


// =================================
// GET EXTERNAL SUPERVISOR REQUESTS
// =================================

const getExternalSupervisorRequests = async (req, res) => {

    try {

        const requests =
            await prisma.external_supervisor_requests.findMany({

                orderBy: {
                    created_at: "desc"
                }

            });


        res.json(requests);


    } catch (error) {

        console.error(
            "Failed to fetch external supervisor requests:",
            error
        );


        res.status(500).json({
            message: "Failed to fetch requests"
        });

    }

};




// =================================
// APPROVE EXTERNAL SUPERVISOR
// =================================

const approveExternalSupervisor = async (req, res) => {


    try {


        const { id } = req.params;


        const request =
            await prisma.external_supervisor_requests.findUnique({

                where: {
                    id: Number(id)
                }

            });



        if (!request) {

            return res.status(404).json({

                message: "Request not found"

            });

        }



        // Check already approved
        if (request.status === "Approved") {

            return res.status(400).json({

                message: "Request already approved"

            });

        }




        const tempPassword = "123@abc";


        const hashedPassword =
            await bcrypt.hash(
                tempPassword,
                10
            );



        await prisma.$transaction(async (tx) => {


            // Create supervisor profile

            await tx.supervisors.create({

                data: {


                    title:
                        request.title,


                    name:
                        request.name,


                    email:
                        request.email,


                    expertise:
                        request.expertise,


                    research_interests:
                        request.research_interests,


                    preferred_supervision_slots:
                        request.preferred_supervision_slots


                }

            });



            // Create login account

            await tx.users.create({

                data: {


                    name:
                        request.name,


                    email:
                        request.email,


                    password:
                        hashedPassword,


                    role:
                        "supervisor",


                    is_active:
                        true

                }

            });





            // Update request

            await tx.external_supervisor_requests.update({

                where: {
                    id: Number(id)
                },


                data: {


                    status:
                        "Approved",


                    approved_at:
                        new Date(),


                    approved_by:
                        "Admin"

                }

            });



        });




        res.json({

            message:
                "External supervisor approved successfully",

            temporaryPassword:
                tempPassword

        });



    }
    catch (error) {


        console.error(
            "Approval error:",
            error
        );


        res.status(500).json({

            message:
                "Failed to approve supervisor"

        });

    }


};





// =================================
// REJECT EXTERNAL SUPERVISOR
// =================================

const rejectExternalSupervisor = async (req, res) => {


    try {


        const { id } = req.params;


        const {
            rejection_reason
        } = req.body;



        await prisma.external_supervisor_requests.update({

            where: {
                id: Number(id)
            },


            data: {


                status:
                    "Rejected",


                rejection_reason

            }

        });



        res.json({

            message:
                "Request rejected"

        });


    }
    catch (error) {


        console.error(error);


        res.status(500).json({

            message:
                "Failed to reject request"

        });

    }

};

// GET PENDING REQUESTS

const getPendingRequests = async (req, res) => {

    try {

        const requests =
            await prisma.external_supervisor_requests.findMany({
                where: {
                    status: "Pending"
                },
                orderBy: {
                    created_at: "desc"
                }
            });


        res.json(requests);


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to fetch requests"
        });

    }

};





module.exports = {

    getExternalSupervisorRequests,

    approveExternalSupervisor,

    rejectExternalSupervisor,

    getPendingRequests

};