const supertest = require("supertest");
const app = require("../app");

const api = supertest(app);

test("La raíz de la api ha respondido", async () => {
	await api.get("/")
		.expect(200)
		.expect("Content-Type", /application\/json/);
});
