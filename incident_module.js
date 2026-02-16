const express = require("express");
const router = express.Router();

let inc = [];
let idc = 1;

router.post("/incidents", (req, res) => {
    const { title, desc, severity } = req.body;

    if (!title) {
        return res.status(400).json({ msg: "title req" });
    }

    const newInc = {
        id: idc++,
        title,
        desc: desc || "no desc",
        severity: severity || "low",
        status: "open",
        createdAt: new Date()
    };

    inc.push(newInc);

    res.json({ msg: "incident created", data: newInc });
});

router.get("/incidents", (req, res) => {
    res.json(inc);
});

router.put("/incidents/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    const obj = inc.find(x => x.id === id);

    if (!obj) {
        return res.status(404).json({ msg: "not found" });
    }

    obj.status = status || obj.status;

    res.json({ msg: "updated", data: obj });
});

router.delete("/incidents/:id", (req, res) => {
    const id = parseInt(req.params.id);

    inc = inc.filter(x => x.id !== id);

    res.json({ msg: "deleted" });
});

module.exports = router;
