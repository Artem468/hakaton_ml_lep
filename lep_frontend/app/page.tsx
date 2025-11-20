'use client'
import {useState} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/app/lib/AuthContext";
import {FiEye, FiEyeOff} from "react-icons/fi";

export default function LoginPage() {
    const {login} = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login(email, password, rememberMe);
            router.push("/loadimage");
        } catch {
            setError("Неверные данные");
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#EEEEEE] flex justify-center items-center p-4">
            <form
                onSubmit={handleSubmit}
                className="bg-white w-5/6 p-4 max-w-md gap-5 flex flex-col items-center rounded-lg p-6 shadow-lg"
            >
                <p className="text-2xl w-full font-bold text-[#FF8D28] text-center">Добро пожаловать</p>

                <input
                    className="p-2 w-full border border-[#BDBDBD] rounded-md"
                    type="text"
                    placeholder="Почта"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <div className="relative w-full">
                    <input
                        className="p-2 w-full border border-[#BDBDBD] rounded-md"
                        type={showPassword ? "text" : "password"}
                        placeholder="Пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <span
                        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <FiEyeOff size={20}/> : <FiEye size={20}/>}
                    </span>
                </div>

                <div className="w-full flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className={`appearance-none w-5 h-5 border-2 border-gray-400 rounded-full 
                            checked:bg-[#FF8D28] cursor-pointer transition`}
                    />
                    <label htmlFor="rememberMe" className="text-sm select-none">
                        Запомнить меня
                    </label>
                </div>

                {error && <p className="text-red-500">{error}</p>}

                <button className="bg-[#FF8D28] w-full py-2 text-white rounded-full transition" type="submit">
                    Войти
                </button>
            </form>
        </div>
    );
}
