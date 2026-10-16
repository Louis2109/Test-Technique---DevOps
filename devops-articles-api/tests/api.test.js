const request = require("supertest");
const app = require("../src/server");
const { pool } = require("../src/database");

describe("Articles API Test Suite", () => {
  afterAll(async () => {
    // Close database connection pool after tests complete
    await pool.end();
  });

  describe("Validation Tests", () => {
    it("should reject POST /articles when name is missing", async () => {
      const res = await request(app)
        .post("/articles")
        .send({
          description: "Article description",
          price: 19.99,
          stock_quantity: 5,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("message", "Name is required");
    });

    it("should reject POST /articles with negative price", async () => {
      const res = await request(app)
        .post("/articles")
        .send({
          name: "Test Article",
          description: "Article description",
          price: -10,
          stock_quantity: 5,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty(
        "message",
        "The price must be a positive number or zero"
      );
    });

    it("should reject GET /articles/:id with non-integer id", async () => {
      const res = await request(app).get("/articles/not-an-id");
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("message", "Identifiant invalide.");
    });
  });

  describe("Health Check Endpoint", () => {
    it("should return health status payload", async () => {
      const res = await request(app).get("/health");
      // Status is 200 if DB is up, or 503 if DB is down
      expect([200, 503]).toContain(res.statusCode);
      expect(res.body).toHaveProperty("status");
      expect(res.body).toHaveProperty("database");
    });
  });
});
