No module should run any executable code until `init` is called,
with the exception of initializing constants and such.

  * no directly assigned event handlers (i.e. el.onclick = dostuff)
  * always el.addEventListener('eventname', dostuff);
