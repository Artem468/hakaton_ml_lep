"use client";

import React, {useState} from "react";
import Image from "next/image";
import backImage from "@/app/assets/backimage.svg";
import logo from "@/app/assets/logo.svg";
import Link from "next/link";


interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
}

export default function Profile() {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            const userStr = localStorage.getItem("user");
            return userStr ? (JSON.parse(userStr) as User) : null;
        } catch {
            return null;
        }
    });

    return (
        <div className="w-full mx-auto bg-[#11111A] min-h-screen flex flex-col items-center">
            <Image
                src={backImage}
                alt=""
                className="absolute right-0 z-0 size-96 bottom-0"
            />
            <Image
                src={logo}
                alt=""
                className="absolute left-4 z-0 size-16 top-4"
            />
            <header
                className="flex justify-end items-center w-full bg-[#11111A] py-8 p-4 border-b border-gray-200 mb-6">
                <div className="text-[#CACACA] w-full flex justify-center gap-15">
                    <Link href="/loadimage">Создать проект</Link>
                    <Link href="/allproject">Все проекты</Link>
                    <Link href="/stats">Статистика</Link>
                </div>


            </header>

            <div className="w-4/5 z-20 bg-[#1A1A25]">
                <div className="bg-[#1A1A25] flex justify-start items-center gap-5 p-6 rounded-2xl mb-6">
                    <div
                        className="w-24 h-24 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                        {currentUser?.first_name[0]}
                        {currentUser?.last_name[0]}
                    </div>
                    <span className="text-2xl font-medium text-[#CACACA]">
                {currentUser?.first_name} {currentUser?.last_name}
              </span>
                </div>
            </div>

        </div>
    );
}
