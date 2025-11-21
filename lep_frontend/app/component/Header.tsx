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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <header className="w-full bg-[#11111A] border-b border-gray-700 sticky top-0 z-[100]">
            <div className="flex items-center justify-between p-4">
                <Link href="/loadimage">
                    <Image
                        src={logo}
                        alt="Logo"
                        className="size-12 md:size-16"
                    />
                </Link>

                {showNavigation && (
                    <nav className="hidden lg:flex flex-1 justify-center">
                        <div className="text-[#CACACA] flex gap-8">
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
                    </nav>
                )}

                {showProfile && (
                    <Link href="/profile" className="hidden md:flex items-center gap-3">
                        {currentUser ? (
                            <>
                                <span className="text-sm font-medium text-[#CACACA] hidden lg:block">
                                    {currentUser.first_name} {currentUser.last_name}
                                </span>
                                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                    {currentUser.first_name[0]}
                                    {currentUser.last_name[0]}
                                </div>
                            </>
                        ) : (
                            <span className="text-gray-500 text-sm">Загрузка...</span>
                        )}
                    </Link>
                )}

                {(showNavigation || showProfile) && (
                    <button
                        onClick={toggleMobileMenu}
                        className="lg:hidden text-[#CACACA] hover:text-white transition-colors p-2"
                        aria-label="Открыть меню"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 6h16M4 12h16M4 18h16"
                            />
                        </svg>
                    </button>
                )}
            </div>

            {(showNavigation || showProfile) && (
                <>
                    {isMobileMenuOpen && (
                        <div
                            className="fixed inset-0 bg-black bg-opacity-50 z-[110] lg:hidden"
                            onClick={closeMobileMenu}
                        />
                    )}

                    <div
                        className={`fixed top-0 right-0 h-full w-64 bg-[#11111A] border-l border-gray-700 shadow-lg transform transition-transform duration-300 ease-in-out z-[120] lg:hidden ${
                            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
                        }`}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-gray-700">
                            <span className="text-white font-semibold">Меню</span>
                            <button
                                onClick={closeMobileMenu}
                                className="text-[#CACACA] hover:text-white transition-colors"
                                aria-label="Закрыть меню"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <nav className="flex flex-col p-4 gap-4">
                            {showProfile && currentUser && (
                                <Link
                                    href="/profile"
                                    onClick={closeMobileMenu}
                                    className="flex items-center gap-3 pb-4 border-b border-gray-700"
                                >
                                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                        {currentUser.first_name[0]}
                                        {currentUser.last_name[0]}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-white">
                                            {currentUser.first_name} {currentUser.last_name}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            Профиль
                                        </span>
                                    </div>
                                </Link>
                            )}

                            {showNavigation && (
                                <>
                                    <Link
                                        href="/loadimage"
                                        onClick={closeMobileMenu}
                                        className="text-[#CACACA] hover:text-white transition-colors py-2"
                                    >
                                        Создать проект
                                    </Link>
                                    <Link
                                        href="/allproject"
                                        onClick={closeMobileMenu}
                                        className="text-[#CACACA] hover:text-white transition-colors py-2"
                                    >
                                        Все проекты
                                    </Link>
                                    <Link
                                        href="/stats"
                                        onClick={closeMobileMenu}
                                        className="text-[#CACACA] hover:text-white transition-colors py-2"
                                    >
                                        Статистика
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                </>
            )}
        </header>
    );
}
