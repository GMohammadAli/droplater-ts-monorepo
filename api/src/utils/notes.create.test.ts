import request from "supertest";
import app from "..";

const AUTH_TOKEN = process.env.SECRET_AUTH_TOKEN || "mysecret123";

describe("Notes API Integration", () => {
  it("creates a new note and returns 201", async () => {
    const res: any = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${AUTH_TOKEN}`)
      .send({
        title: "Test Note",
        body: "Integration Test Body",
        releaseAt: new Date().toISOString(),
        webhookUrl: "http://localhost:4000/sink/webhook",
        status: "pending",
        attempts: [],
        deliveredAt: null,
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Note created Successfully");
    expect(res.body.id).toHaveLength(24);
  });
});
