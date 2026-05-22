const fetch = global.fetch || require('node-fetch');
(async () => {
  const base = 'http://127.0.0.1:5000/api';
  const email = `tester${Date.now()}@example.com`;
  const password = 'Test1234!';
  try {
    let res = await fetch(`${base}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name:'Tester', email, password }) });
    const reg = await res.json();
    console.log('register', res.status, reg);
    const token = reg.token;
    res = await fetch(`${base}/tasks`, { method:'POST', headers:{'Content-Type':'application/json','x-auth-token':token}, body: JSON.stringify({ title:'API check', description:'test', priority:'medium' }) });
    const task = await res.json();
    console.log('created', res.status, task);
    res = await fetch(`${base}/tasks/${task._id}`, { method:'PUT', headers:{'Content-Type':'application/json','x-auth-token':token}, body: JSON.stringify({ title:task.title, description:task.description, priority:task.priority, dueDate:task.dueDate, progress:task.progress, pomodoroSessions:task.pomodoroSessions, completed:true, slidesFile:task.slidesFile, notesFile:task.notesFile }) });
    const updated = await res.json();
    console.log('updated', res.status, updated);
    res = await fetch(`${base}/tasks`, { headers:{'x-auth-token':token} });
    const tasks = await res.json();
    console.log('tasks', tasks.length, tasks.map(t => ({ id:t.id||t._id, completed:t.completed, title:t.title })));
  } catch(e){ console.error(e); }
})();
