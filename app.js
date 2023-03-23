const express = require("express");
const session = require("express-session");
const morgan = require("morgan");
const cookie = require("cookie-parser");
const { port, sesionSecret } = require("./config/index.config");
const { connection } = require("./config/db.config");
const passport = require("passport");
const cors = require("cors");

//Rutas
const auth = require("./routes/auth.routes");
const users = require("./routes/users.routes");
const products = require("./routes/products.routes");
const slide = require("./routes/slide.routes");
const cart = require("./routes/cart.routes");
const order = require("./routes/order.routes");
const {
	useGoogleStrategy,
	useFacebookStrategy,
	useTwitterStrategy,
	useGitHubStrategy,
} = require("./middleware/authProvider.middleware");

const app = express();

connection();

//Cookies

//Middlewares
app.use(morgan("dev"));
app.use(express.json());
app.use(cookie());
app.use(
	cors({
		origin: [
			"http://localhost:3000",
			"http://localhost:3001",
			"http://127.0.0.1:5500",
			"https://www.neutra.ec",
			"https://neutra.ec",
			"https://www.admin.neutra.ec",
			"https://admin.neutra.ec",
		],
		credentials: true,
	})
);
app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "http://localhost:3000");
	res.header("Access-Control-Allow-Headers", true);
	res.header("Access-Control-Allow-Credentials", true);
	res.header(
		"Access-Control-Allow-Methods",
		"GET, POST, OPTIONS, PUT, PATCH, DELETE"
	);
	next();
});

app.use(
	session({
		secret: sesionSecret,
		resave: false,
		saveUninitialized: false,
	})
);
app.use(passport.initialize());

//Usando estretegias de passport para el Login
passport.use(useGoogleStrategy());
passport.use(useFacebookStrategy());
passport.use(useGitHubStrategy());
passport.use(useTwitterStrategy());

passport.serializeUser((user, done) => {
	done(null, user);
});
passport.deserializeUser((user, done) => {
	done(null, user);
});

//Usando las rutas
auth(app);
users(app);
products(app);
cart(app);
slide(app);
order(app);
//Ruta inicial del servidor
app.get("/", (req, res) => {
	return res.json({
		name: "Ecommerce",
	});
});

//Levantar el servidor
app.listen(port, () => {
	console.log("Listening on: http://localhost:" + port);
});

module.exports = app