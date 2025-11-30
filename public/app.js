document.getElementById("loadContacts").addEventListener("click", async () => {
  const output = document.getElementById("contactsOutput");
  output.textContent = "Loading...";

  try {
    const res = await fetch("http://localhost:3001/api/contacts");
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    output.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    output.textContent = `Error: ${err.message}`;
  }
});
