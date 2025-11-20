"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import logo from "@/app/assets/logo.svg";

interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
}

interface HeaderProps {
    showNavigation?: boolean;
    showProfile?: boolean;
}

export default function Header({
    showNavigation = true,
    showProfile = true
}: HeaderProps) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
                const user: User = JSON.parse(userStr);
                setCurrentUser(user);
            }
        } catch (error) {
            console.error("Ошибка при загрузке пользователя:", error);
        }
    }, []);

    return (
        <header className="w-full bg-[#11111A] border-b border-gray-700 relative z-10">
            <div className="flex items-center justify-between p-4">
                <Image
                    src={logo}
                    alt="Logo"
                    className="size-16"
                />

                {showNavigation && (
                    <div className="flex-1 flex justify-center">
                        <div className="text-[#CACACA] flex gap-15">
                            <Link href="/loadimage" className="hover:text-white transition-colors">
                                Создать проект
                            </Link>
                            <Link href="/allproject" className="hover:text-white transition-colors">
                                Все проекты
                            </Link>
                            <Link href="/stats" className="hover:text-white transition-colors">
                                Статистика
                            </Link>
                        </div>
                    </div>
                )}

                {showProfile && (
                    <Link href="/profile">
                        <div className="flex items-center gap-3">
                            {currentUser ? (
                                <>
                                    <span className="text-sm font-medium text-[#CACACA]">
                                        {currentUser.first_name} {currentUser.last_name}
                                    </span>
                                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                        {currentUser.first_name[0]}
                                        {currentUser.last_name[0]}
                                    </div>
                                </>
                            ) : (
                                <span className="text-gray-500 text-sm">Загрузка...</span>
                            )}
                        </div>
                    </Link>
                )}
            </div>
        </header>
    );
}
