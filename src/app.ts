import express from "express";
import matchRoutes from "./routes/matchRoutes.js";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use("/match", matchRoutes);

app.get("/", (req, res) => {
    res.json({ message: "TalentSync API running" });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});