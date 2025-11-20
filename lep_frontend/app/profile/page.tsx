"use client";

import { useState } from "react";

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
        <div>
            {currentUser ? (
                <div>
                    <p>Имя: {currentUser.first_name}</p>
                    <p>Фамилия: {currentUser.last_name}</p>
                    <p>Email: {currentUser.email}</p>
                </div>
            ) : (
                <p>Загрузка пользователя...</p>
            )}
        </div>
    );
}
