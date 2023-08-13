const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const { format } = require("date-fns");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const validStatus = ["TO DO", "IN PROGRESS", "DONE"];
const validPriority = ["HIGH", "MEDIUM", "LOW"];
const validCategory = ["WORK", "HOME", "LEARNING"];

// Helper functions for validation

app.get("/todos/", async (req, res) => {
  const { status, priority, category, search_q } = req.query;

  // Validate status, priority, category, and search_q

  if (status && !validStatus.includes(status)) {
    return res.status(400).send("Invalid Todo Status");
  }
  if (priority && !validPriority.includes(priority)) {
    return res.status(400).send("Invalid Todo Priority");
  }
  if (category && !validCategory.includes(category)) {
    return res.status(400).send("Invalid Todo Category");
  }

  try {
    let query = "SELECT * FROM todo WHERE 1";
    const queryParams = [];

    if (status) {
      query += " AND status = ?";
      queryParams.push(status);
    }
    if (priority) {
      query += " AND priority = ?";
      queryParams.push(priority);
    }
    if (category) {
      query += " AND category = ?";
      queryParams.push(category);
    }
    if (search_q) {
      query += " AND todo LIKE ?";
      queryParams.push(`%${search_q}%`);
    }

    const result = await database.all(query, queryParams);

    // Transform the response to use due_date as dueDate
    const transformedResult = result.map((todo) => ({
      id: todo.id,
      todo: todo.todo,
      priority: todo.priority,
      status: todo.status,
      category: todo.category,
      dueDate: format(new Date(todo.due_date), "yyyy-MM-dd"),
    }));

    res.json(transformedResult);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// API 2: GET specific todo based on todo ID
app.get("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;

  try {
    const todo = await database.get("SELECT * FROM todo WHERE id = ?", todoId);
    if (todo) {
      res.json(todo);
    } else {
      res.status(404).send("Todo Not Found");
    }
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// API 3: GET list of todos with a specific due date
app.get("/agenda/", async (req, res) => {
  const { date } = req.query;

  if (!isValidDate(date)) {
    res.status(400).send("Invalid Due Date");
    return;
  }

  try {
    const formattedDate = format(new Date(date), "yyyy-MM-dd");
    const todos = await database.all(
      "SELECT * FROM todo WHERE due_date = ?",
      formattedDate
    );
    res.json(todos);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// API 4: POST create a new todo

app.post("/todos/", async (req, res) => {
  const { todo, category, priority, status, dueDate } = req.body;

  if (status && !validStatus.includes(status)) {
    res.status(400).send("Invalid Todo Status");

    return;
  }

  if (priority && !validPriority.includes(priority)) {
    res.status(400).send("Invalid Todo Priority");

    return;
  }

  if (category && !validCategory.includes(category)) {
    res.status(400).send("Invalid Todo Category");
    return;
  }

  if (dueDate && !validDate.includes(dueDate)) {
    res.status(400).send("Invalid Due Date");

    return;
  }
  if (!isValidDate(dueDate)) {
    return res.status(400).send("Invalid Due Date");
  }

  try {
    const formattedDueDate = format(new Date(dueDate), "yyyy-MM-dd");

    await database.run(
      "INSERT INTO todo (todo, category, priority, status, due_date) VALUES (?, ?, ?, ?, ?)",

      [todo, category, priority, status, formattedDueDate]
    );

    res.send("Todo Successfully Added");
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// API 5: PUT update details of a specific todo based on todo ID

// API 5 - PUT update todo
app.put("/todos/:todoId/", (req, res) => {
  const todoId = req.params.todoId;
  const updateData = req.body;

  const validStatus = ["TO DO", "IN PROGRESS", "DONE"];
  const validPriority = ["HIGH", "MEDIUM", "LOW"];
  const validCategory = ["WORK", "HOME", "LEARNING"];

  const validProperties = ["status", "priority", "todo", "category", "dueDate"];
  for (const prop in updateData) {
    if (!validProperties.includes(prop)) {
      return res.status(400).send("Invalid Property: " + prop);
    }
    if (prop === "status" && !validStatus.includes(updateData[prop])) {
      return res.status(400).send("Invalid Todo Status");
    }
    if (prop === "priority" && !validPriority.includes(updateData[prop])) {
      return res.status(400).send("Invalid Todo Priority");
    }
    if (prop === "category" && !validCategory.includes(updateData[prop])) {
      return res.status(400).send("Invalid Todo Category");
    }
    if (prop === "dueDate") {
      const formattedDueDate = format(new Date(updateData[prop]), "yyyy-MM-dd");
      if (formattedDueDate === "Invalid Date") {
        return res.status(400).send("Invalid Due Date");
      }
      updateData[prop] = formattedDueDate;
    }
  }

  const updateSet = Object.keys(updateData)
    .map((prop) => `${prop} = ?`)
    .join(", ");

  const values = Object.values(updateData);
  values.push(todoId);

  const updateQuery = `UPDATE todo SET ${updateSet} WHERE id = ?`;
  db.run(updateQuery, values, (err) => {
    if (err) {
      return res.status(500).send(err.message);
    }

    // Return different response messages based on the updated property
    if ("status" === updateData.status) {
      return res.send("Status Updated");
    } else if ("priority" === updateData.priority) {
      return res.send("Priority Updated");
    } else if ("todo" === updateData.todo) {
      return res.send("Todo Updated");
    } else if ("category" === updateData.category) {
      return res.send("Category Updated");
    } else if ("dueDate" === updateData.dueDate) {
      return res.send("Due Date Updated");
    }
  });
});

// API 6: Delete a Todo
app.delete("/todos/:todoId/", async (req, res) => {
  const todoId = req.params.todoId;

  try {
    const result = await database.run("DELETE FROM todo WHERE id = ?", [
      todoId,
    ]);

    if (result.changes > 0) {
      return res.send("Todo Deleted");
    }

    res.status(404).send("Todo not found");
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

function isValidDate(dateString) {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  return pattern.test(dateString);
}

module.exports = app;
