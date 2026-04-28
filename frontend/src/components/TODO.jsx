import { useState } from "react";
import "../styles/todo.css";

export default function TodoPanel({ todos, crdt }) {
  const [newTask, setNewTask] = useState("");

  const addTask = () => {
    const task = newTask.trim();
    if (!task || !crdt) return;
    crdt.add({ kind: "todo", task });
    setNewTask("");
  };

  const removeTask = (task) => {
    if (!crdt) return;
    crdt.add({ kind: "todoRemove", task });
  };

  return (
    <div className="todo-panel">
      <h4>TODO</h4>

      <ul className="todo-list">
        {todos.map((task) => (
          <li key={task} className="todo-item">
            <span>{task}</span>
            <button
              onClick={() => removeTask(task)}
              disabled={!crdt}
              className="todo-remove-btn"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="todo-input-row">
        <input
          type="text"
          value={newTask}
          placeholder={crdt ? "Add new task" : "Connecting..."}
          onChange={(e) => setNewTask(e.target.value)}
          disabled={!crdt}
          className="todo-input"
          onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
        />
        <button
          onClick={addTask}
          disabled={!crdt}
          className="todo-add-btn"
        >
          Add
        </button>
      </div>
    </div>
  );
}