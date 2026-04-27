import { useState } from "react";

export default function TodoPanel({ todos, crdt }) {
  const [newTask, setNewTask] = useState("");

  const addTask = () => {
    const task = newTask.trim();
    if (!task || !crdt) return;

    crdt.add({
      kind: "todo",
      task
    });

    setNewTask("");
  };

  const removeTask = (task) => {
    if (!crdt) return;

    crdt.add({
      kind: "todoRemove",
      task
    });
  };

  return (
    <div style={{ padding: "10px" }}>
      <h4>TODO</h4>

      <ul style={{ paddingLeft: "20px" }}>
        {todos.map((task) => (
          <li key={task} style={{ marginBottom: "6px" }}>
            {task}
            <button
              onClick={() => removeTask(task)}
              disabled={!crdt}
              style={{ marginLeft: "6px", cursor: "pointer" }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: "10px" }}>
        <input
          type="text"
          value={newTask}
          placeholder={crdt ? "Add new task" : "Connecting..."}
          onChange={(e) => setNewTask(e.target.value)}
          disabled={!crdt}
          style={{ width: "70%", padding: "4px" }}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTask();
          }}
        />

        <button
          onClick={addTask}
          disabled={!crdt}
          style={{ marginLeft: "6px", padding: "4px 8px" }}
        >
          Add
        </button>
      </div>
    </div>
  );
}