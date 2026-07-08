import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    GraduationCap,
    Mail,
    Lock,
    User,
    Building2,
    ArrowLeft,
    Send
} from "lucide-react";

import { registerExternalSupervisor } from "../../api/api";


const ExternalSupervisorRegister = () => {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: "",
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        university: "",
        expertise: "",
        researchInterests: "",
        preferredSlots: 3
    });


    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);



    const handleChange = (e) => {

        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });

    };



    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");
        setSuccess("");


        if (
            formData.password !==
            formData.confirmPassword
        ) {

            setError(
                "Passwords do not match."
            );

            return;

        }


        try {

            setLoading(true);


            const response =
                await registerExternalSupervisor({

                    title: formData.title,

                    fullName:
                        formData.fullName,

                    email:
                        formData.email,

                    password:
                        formData.password,

                    university:
                        formData.university,

                    expertise:
                        formData.expertise,

                    researchInterests:
                        formData.researchInterests,

                    preferredSlots:
                        formData.preferredSlots

                });



            if (response.data.success) {

                setSuccess(
                    response.data.message
                );


                setTimeout(() => {

                    navigate("/");

                }, 3000);

            }


        }
        catch (err) {

            setError(
                err.response?.data?.message ||
                "Registration failed."
            );

        }
        finally {

            setLoading(false);

        }

    };




    return (

        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">


            <div className="bg-white w-full max-w-xl rounded shadow border border-slate-200 p-8">


                {/* Header */}

                <div className="mb-8">

                    <div className="flex items-center gap-3 mb-4">

                        <div className="h-12 w-12 rounded bg-navy-900 flex items-center justify-center">

                            <GraduationCap
                                className="text-white"
                            />

                        </div>


                        <div>

                            <h1 className="text-xl font-bold text-slate-900">
                                External Supervisor Registration
                            </h1>


                            <p className="text-sm text-slate-500">
                                Submit your request for Admin approval
                            </p>

                        </div>


                    </div>


                </div>



                {
                    error &&
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">

                        {error}

                    </div>
                }



                {
                    success &&
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">

                        {success}

                    </div>
                }



                <form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                >



                    {/* Title */}

                    <div>

                        <label className="text-sm font-semibold">
                            Title
                        </label>

                        <select
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="w-full mt-1 border rounded px-3 py-2"
                        >

                            <option value="">
                                Select Title
                            </option>

                            <option>
                                Dr.
                            </option>

                            <option>
                                Prof.
                            </option>

                            <option>
                                Mr.
                            </option>

                            <option>
                                Ms.
                            </option>

                        </select>


                    </div>




                    {/* Name */}

                    <Input
                        icon={User}
                        label="Full Name"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                    />



                    {/* Email */}

                    <Input
                        icon={Mail}
                        label="Personal Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />



                    {/* Password */}

                    <Input
                        icon={Lock}
                        label="Password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />



                    <Input
                        icon={Lock}
                        label="Confirm Password"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                    />




                    <Input
                        icon={Building2}
                        label="University"
                        name="university"
                        value={formData.university}
                        onChange={handleChange}
                        required
                    />



                    <div>

                        <label className="text-sm font-semibold">
                            Expertise
                        </label>


                        <textarea
                            name="expertise"
                            value={formData.expertise}
                            onChange={handleChange}
                            className="w-full mt-1 border rounded px-3 py-2"
                            rows="2"
                        />

                    </div>




                    <div>

                        <label className="text-sm font-semibold">
                            Research Interests
                        </label>


                        <textarea
                            name="researchInterests"
                            value={formData.researchInterests}
                            onChange={handleChange}
                            className="w-full mt-1 border rounded px-3 py-2"
                            rows="2"
                        />

                    </div>




                    <div>

                        <label className="text-sm font-semibold">
                            Preferred Supervision Slots
                        </label>


                        <input
                            type="number"
                            name="preferredSlots"
                            min="1"
                            value={formData.preferredSlots}
                            onChange={handleChange}
                            className="w-full mt-1 border rounded px-3 py-2"
                        />

                    </div>




                    <button
                        disabled={loading}
                        className="
                        w-full 
                        bg-navy-900 
                        text-white 
                        py-3 
                        rounded 
                        font-semibold
                        flex
                        items-center
                        justify-center
                        gap-2
                        hover:bg-navy-950
                        "
                    >

                        {
                            loading
                                ?
                                "Submitting..."
                                :
                                <>
                                    <Send size={18} />
                                    Submit Registration
                                </>
                        }


                    </button>



                </form>



                <button

                    onClick={() => navigate("/")}

                    className="
                    mt-5
                    flex
                    items-center
                    gap-2
                    text-sm
                    text-slate-600
                    hover:text-black
                    "

                >

                    <ArrowLeft size={16} />

                    Back to Login

                </button>



            </div>


        </div>

    );

};




// Reusable input

const Input = ({
    icon: Icon,
    label,
    name,
    type = "text",
    value,
    onChange,
    required
}) => (

    <div>

        <label className="text-sm font-semibold">
            {label}
        </label>


        <div className="relative mt-1">

            <Icon
                className="
absolute 
left-3 
top-3 
text-slate-400
"
                size={18}
            />


            <input

                type={type}

                name={name}

                value={value}

                onChange={onChange}

                required={required}

                className="
w-full
pl-10
border
rounded
px-3
py-2
"

            />

        </div>

    </div>

);



export default ExternalSupervisorRegister;