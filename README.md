# TaskMesh

A smart workflow system that assigns client requests to employees based on capability and efficiency, keeping workloads balanced and giving managers real-time oversight.

**Live demo:** [task-mesh.vercel.app](https://task-mesh.vercel.app)

## Features

- **Smart task allocation:** requests are matched to employees by skill set, current workload, and performance.
- **Role-based access:** separate experiences for clients, managers, and employees.
- **Secure authentication:** Firebase Authentication with role checks on protected actions.
- **Real-time oversight:** managers get real-time visibility into team workloads.

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Angular 21, TypeScript |
| Backend | Firebase (Authentication, Firestore) |
| Hosting | Vercel |

## Getting started

Requires Node.js and npm.

```bash
git clone https://github.com/Q9Kawaii/TaskMesh.git
cd TaskMesh
npm install
ng serve
```

Open http://localhost:4200/. The app reloads automatically when you change a source file.

## Scripts

| Command | What it does |
|---------|--------------|
| `ng serve` | Start the local dev server |
| `ng build` | Create a production build in `dist/` |
| `ng test` | Run unit tests with Vitest |

## Author

Built by [Yash Dingar](https://github.com/Q9Kawaii) · [Portfolio](https://yashdingar.space) · [LinkedIn](https://www.linkedin.com/in/yashdingar/)
