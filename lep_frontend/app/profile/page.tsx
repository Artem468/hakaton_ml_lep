"use client";

import React, { useState } from "react";
import Image from "next/image";
import backImage from "@/app/assets/backimage.svg";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/api/api";
import Header from "@/app/component/Header";

interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
}

export default function Profile() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            const userStr = localStorage.getItem("user");
            return userStr ? (JSON.parse(userStr) as User) : null;
        } catch {
            return null;
        }
    });

    const handleLogout = async () => {
        try {
            const refreshToken = localStorage.getItem("refreshToken");

            if (refreshToken) {
                await apiFetch("users/logout/", {
                    method: "POST",
                    body: JSON.stringify({
                        refresh: refreshToken
                    })
                });
            }
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            localStorage.clear();
            router.push("/");
        }
    };

    return (
        <div className="w-full mx-auto bg-[#11111A] min-h-screen flex flex-col items-center">
            <Image
                src={backImage}
                alt=""
                className="absolute right-0 z-0 size-96 bottom-0"
            />
            <Header showProfile={false} />

            <div className="w-4/5 z-20 mt-6 bg-[#1A1A25]">
                <div className="bg-[#1A1A25] flex justify-start items-center gap-5 p-6 rounded-2xl mb-6">
                    <div className="w-24 h-24 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                        {currentUser?.first_name[0]}
                        {currentUser?.last_name[0]}
                    </div>
                    <span className="text-2xl font-medium text-[#CACACA]">
                        {currentUser?.first_name} {currentUser?.last_name}
                    </span>
                </div>

                <div className="bg-[#1A1A25] p-6 rounded-2xl">
                    <button
                        onClick={handleLogout}
                        className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                    >
                        Выйти
                    </button>
                </div>
            </div>
        </div>
    );
}
