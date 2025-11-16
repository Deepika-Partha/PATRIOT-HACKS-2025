// import { redirect } from '@sveltejs/kit';
// import { verifyJwt } from '$lib/server/jwt';
// import type { RequestEvent } from '@sveltejs/kit';


// export async function POST({ request, cookies }: RequestEvent) {
//     const token = cookies.get('jwt');
//     const user: JwtPayload | null = token ? verifyJwt(token) : null;

//     // Redirect to login if user not authenticated and not already on login page
//     if (!user && url.pathname !== '/login') {
//         throw redirect(302, '/login');
//     }

//     return { user };
// };








