// src/lib/server/auth.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "$env/static/private";

export class AuthService {
    static async hashPassword(password: string) {
        return bcrypt.hash(password, 10);
    }

    static async compare(password: string, hash: string) {
        return bcrypt.compare(password, hash);
    }

    static generateToken(user: any) {
        return jwt.sign(
            {
                id: user._id,
                email: user.email
            },
            JWT_SECRET,
            { expiresIn: "7d" }
        );
    }

    static verifyToken(token: string) {
        return jwt.verify(token, JWT_SECRET);
    }
}
