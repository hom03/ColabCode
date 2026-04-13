import { useState } from "react";

export default function TodoPanel({ todos, crdt }) {
  const [newTask, setNewTask] = useState("");

  const addTask = () => {
    if (!newTask.trim()) return;

    crdt?.add({
      kind: "todo",
      task: newTask.trim()
    });

    setNewTask("");
  };

  const removeTask = (task) => {
    crdt?.add({
      kind: "todoRemove",
      task
    });
  };

  return (
    <div style={{ padding: "10px" }}>
      <h4>TODO</h4>
      <ul style={{ paddingLeft: "20px" }}>
        {todos.map((task, idx) => (
          <li key={idx} style={{ marginBottom: "6px" }}>
            {task}
            <button
              onClick={() => removeTask(task)}
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
          placeholder="Add new task"
          onChange={(e) => setNewTask(e.target.value)}
          style={{ width: "70%", padding: "4px" }}
        />
        <button
          onClick={addTask}
          style={{ marginLeft: "6px", padding: "4px 8px" }}
        >
          Add
        </button>
      </div>
    </div>
  );
}