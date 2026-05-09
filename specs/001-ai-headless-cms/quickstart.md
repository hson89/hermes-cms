# Quickstart

1. Ensure you have Node.js 22.x and PostgreSQL installed.
2. Clone the repository and run `npm install` in both `backend` and `frontend-admin`.
3. Set up the environment variables: `cp .env.example .env`.
4. Run migrations: `npm run prisma migrate dev` inside `backend`.
5. Start the backend: `npm run start:dev`.
6. Start the admin UI: `npm run dev` in the `frontend-admin` directory.
7. Create a tenant and begin testing the AI content generation feature.