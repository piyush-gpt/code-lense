import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import https from "https";
import fs from "fs";
import path from "path";

import githubRoutes from "./routes/github.ts";
import userRoutes from "./routes/user.ts";
import protectedRoutes from "./routes/protected.ts";
import pragentRoutes from "./routes/pragent.ts";
import codequeryRoutes from "./routes/codequery.ts";
import webhookMiddleware from "./webhooks/webhooks.ts";
import bodyParser from "body-parser";
import { connectDB } from "./database/database.ts";
import { config } from "./config/config.ts";

dotenv.config();

const app = express();

app.use("/api/webhooks/github", 
  bodyParser.raw({ type: "application/json" }),
  webhookMiddleware
);

app.use(cors({
  origin: [config.FRONTEND_URL, 'https://localhost:3000'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api", githubRoutes);
app.use("/api/user", userRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/pragent", pragentRoutes);
app.use("/api/codequery", codequeryRoutes);
app.get("/", (req, res) => {
  res.send("Hello World");
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();
    
    // HTTPS options
    const httpsOptions = {
      key: fs.readFileSync(path.join(process.cwd(), 'localhost+2-key.pem')),
      cert: fs.readFileSync(path.join(process.cwd(), 'localhost+2.pem')),
    };
    
    https.createServer(httpsOptions, app).listen(config.PORT, () => {
      console.log(`🚀 DevDashAI backend running on HTTPS port ${config.PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
