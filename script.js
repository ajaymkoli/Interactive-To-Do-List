document.addEventListener('DOMContentLoaded', () => {
    // DOM element references
    const taskInput = document.getElementById('task-input');
    const dueDateInput = document.getElementById('due-date-input');
    const priorityInput = document.getElementById('priority-input');
    const addBtn = document.getElementById('add-btn');
    const taskList = document.getElementById('task-list');
    const searchInput = document.getElementById('search-input');
    const filterAllBtn = document.getElementById('filter-all');
    const filterActiveBtn = document.getElementById('filter-active');
    const filterCompletedBtn = document.getElementById('filter-completed');
    const clearCompletedBtn = document.getElementById('clear-completed-btn');
    const deleteAllBtn = document.getElementById('delete-all-btn');

    // Modal elements
    const confirmationModal = document.getElementById('confirmation-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalYesBtn = document.getElementById('modal-yes-btn');
    const modalNoBtn = document.getElementById('modal-no-btn');

    let tasks = []; // Array to hold task objects
    let currentFilter = 'all'; // Current filter state: 'all', 'active', 'completed'
    let draggedItem = null; // Stores the task being dragged

    // --- Local Storage Operations ---

    // Saves current tasks array to local storage
    function saveTasks() {
        localStorage.setItem('todoTasks', JSON.stringify(tasks));
    }

    // Loads tasks from local storage on app start
    function loadTasks() {
        const storedTasks = localStorage.getItem('todoTasks');
        if (storedTasks) {
            tasks = JSON.parse(storedTasks);
            renderTasks();
        }
    }

    // --- Confirmation Modal ---

    /**
     * Displays a custom confirmation modal.
     * @param {string} message - Message to show in the modal.
     * @returns {Promise<boolean>} Resolves true if 'Yes', false if 'No'.
     */
    function showConfirmationModal(message) {
        return new Promise(resolve => {
            modalMessage.textContent = message;
            confirmationModal.classList.add('show');

            const handleYes = () => {
                confirmationModal.classList.remove('show');
                modalYesBtn.removeEventListener('click', handleYes);
                modalNoBtn.removeEventListener('click', handleNo);
                resolve(true);
            };

            const handleNo = () => {
                confirmationModal.classList.remove('show');
                modalYesBtn.removeEventListener('click', handleYes);
                modalNoBtn.removeEventListener('click', handleNo);
                resolve(false);
            };

            modalYesBtn.addEventListener('click', handleYes);
            modalNoBtn.addEventListener('click', handleNo);
        });
    }

    // --- Task Management ---

    // Formats current date and time
    function getCurrentDateTime() {
        const now = new Date();
        const date = now.toLocaleDateString();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${date} at ${time}`;
    }

    // Renders tasks to the DOM based on current filters and search query
    function renderTasks() {
        taskList.innerHTML = ''; // Clear existing tasks for re-render

        const filteredAndSearchedTasks = tasks.filter(task => {
            const matchesFilter = (currentFilter === 'all') ||
                                  (currentFilter === 'active' && !task.completed) ||
                                  (currentFilter === 'completed' && task.completed);

            const matchesSearch = task.text.toLowerCase().includes(searchInput.value.toLowerCase());

            return matchesFilter && matchesSearch;
        });

        filteredAndSearchedTasks.forEach(task => {
            const li = document.createElement('li');
            li.setAttribute('data-id', task.id);
            li.setAttribute('draggable', 'true');

            // Task content area
            const taskContent = document.createElement('div');
            taskContent.className = 'task-content';

            // Checkbox for completion
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'task-checkbox';
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', async () => {
                const isCurrentlyCompleted = tasks[tasks.findIndex(t => t.id === task.id)].completed;
                const action = isCurrentlyCompleted ? 'uncomplete' : 'complete';
                const message = `Are you sure you want to ${action} this task?`;

                const confirmed = await showConfirmationModal(message);

                if (confirmed) {
                    tasks[tasks.findIndex(t => t.id === task.id)].completed = !isCurrentlyCompleted;
                    saveTasks();
                    renderTasks();
                } else {
                    checkbox.checked = isCurrentlyCompleted; // Revert checkbox state
                }
            });

            // Task text (editable)
            const taskSpan = document.createElement('span');
            taskSpan.className = 'task-text';
            taskSpan.textContent = task.text;
            taskSpan.addEventListener('click', (e) => {
                if (e.target !== taskSpan || taskSpan.classList.contains('editing')) return;

                const currentText = taskSpan.textContent;
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'task-text-input';
                input.value = currentText;
                taskSpan.classList.add('editing');
                taskSpan.replaceWith(input);
                input.focus();

                const saveEdit = () => {
                    const newText = input.value.trim();
                    if (newText !== '' && newText !== currentText) {
                        tasks[tasks.findIndex(t => t.id === task.id)].text = newText;
                        saveTasks();
                    }
                    input.replaceWith(taskSpan);
                    taskSpan.textContent = newText === '' ? currentText : newText;
                    taskSpan.classList.remove('editing');
                    renderTasks();
                };

                input.addEventListener('blur', saveEdit);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        input.blur();
                    }
                });
            });

            // Delete button for task
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'delete-btn';
            deleteBtn.addEventListener('click', async () => {
                const confirmed = await showConfirmationModal('Are you sure you want to delete this task?');
                if (confirmed) {
                    li.style.animation = 'slideOut 0.4s forwards';
                    li.addEventListener('animationend', () => {
                        tasks.splice(tasks.findIndex(t => t.id === task.id), 1);
                        saveTasks();
                        renderTasks();
                    });
                }
            });

            taskContent.appendChild(checkbox);
            taskContent.appendChild(taskSpan);
            taskContent.appendChild(deleteBtn);

            // Task metadata (creation date, due date, priority)
            const taskMeta = document.createElement('div');
            taskMeta.className = 'task-meta';

            const creationDateDisplay = document.createElement('span');
            creationDateDisplay.className = 'task-date';
            creationDateDisplay.textContent = `Created: ${task.date}`;
            taskMeta.appendChild(creationDateDisplay);

            const dueDateDisplay = document.createElement('span');
            dueDateDisplay.className = 'task-date';
            dueDateDisplay.textContent = `Due: ${new Date(task.dueDate).toLocaleDateString()}`;
            if (new Date(task.dueDate) < new Date() && !task.completed) {
                dueDateDisplay.classList.add('overdue');
            }
            taskMeta.appendChild(dueDateDisplay);
            
            const priorityDisplay = document.createElement('span');
            priorityDisplay.className = 'task-priority';
            priorityDisplay.textContent = `Priority: ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`;
            taskMeta.appendChild(priorityDisplay);

            li.appendChild(taskContent);
            li.appendChild(taskMeta);

            // Apply completion and priority styles
            if (task.completed) {
                li.classList.add('completed');
            } else {
                li.classList.remove('completed');
            }
            li.classList.remove('priority-low', 'priority-medium', 'priority-high');
            li.classList.add(`priority-${task.priority}`);

            taskList.appendChild(li);
        });
    }

    // Adds a new task to the list
    function addTask() {
        const taskText = taskInput.value.trim();
        const dueDate = dueDateInput.value;
        const priority = priorityInput.value;

        // Input validation
        if (taskText === '') {
            alert('Please enter a task description.');
            return;
        }
        if (dueDate === '') {
            alert('Please select a due date for the task.');
            return;
        }

        const newTask = {
            id: Date.now().toString(),
            text: taskText,
            date: getCurrentDateTime(),
            dueDate: dueDate,
            priority: priority,
            completed: false
        };
        tasks.unshift(newTask); // Add to beginning
        taskInput.value = '';
        dueDateInput.value = '';
        priorityInput.value = 'low';
        saveTasks();
        renderTasks();
    }

    // --- Event Listeners ---

    addBtn.addEventListener('click', addTask);

    taskInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            addTask();
        }
    });

    // Handles clearing all completed tasks
    clearCompletedBtn.addEventListener('click', async () => {
        const completedTasksCount = tasks.filter(task => task.completed).length;
        if (completedTasksCount === 0) {
            return;
        }

        const confirmed = await showConfirmationModal(`Are you sure you want to clear all ${completedTasksCount} completed tasks?`);
        if (confirmed) {
            const completedLis = Array.from(taskList.children).filter(li => li.classList.contains('completed'));
            let animationsFinished = 0;

            if (completedLis.length > 0) {
                completedLis.forEach(li => {
                    li.style.animation = 'slideOut 0.4s forwards';
                    li.addEventListener('animationend', function handler() {
                        animationsFinished++;
                        if (animationsFinished === completedLis.length) {
                            tasks = tasks.filter(task => !task.completed);
                            saveTasks();
                            renderTasks();
                        }
                        li.removeEventListener('animationend', handler);
                    });
                });
            } else {
                tasks = tasks.filter(task => !task.completed);
                saveTasks();
                renderTasks();
            }
        }
    });

    // Handles deleting all tasks
    deleteAllBtn.addEventListener('click', async () => {
        if (tasks.length === 0) {
            return;
        }

        const confirmed = await showConfirmationModal(`Are you sure you want to delete all ${tasks.length} tasks? This action cannot be undone.`);
        if (confirmed) {
            const allLis = Array.from(taskList.children);
            let animationsFinished = 0;

            if (allLis.length > 0) {
                allLis.forEach(li => {
                    li.style.animation = 'slideOut 0.4s forwards';
                    li.addEventListener('animationend', function handler() {
                        animationsFinished++;
                        if (animationsFinished === allLis.length) {
                            tasks = []; // Clear tasks array
                            saveTasks();
                            renderTasks();
                        }
                        li.removeEventListener('animationend', handler);
                    });
                });
            } else {
                tasks = [];
                saveTasks();
                renderTasks();
            }
        }
    });

    // Filter button handlers
    filterAllBtn.addEventListener('click', () => {
        currentFilter = 'all';
        updateFilterButtons('filter-all');
        renderTasks();
    });

    filterActiveBtn.addEventListener('click', () => {
        currentFilter = 'active';
        updateFilterButtons('filter-active');
        renderTasks();
    });

    filterCompletedBtn.addEventListener('click', () => {
        currentFilter = 'completed';
        updateFilterButtons('filter-completed');
        renderTasks();
    });

    // Updates active state of filter buttons
    function updateFilterButtons(activeButtonId) {
        document.querySelectorAll('.filter-buttons button').forEach(button => {
            button.classList.remove('active');
        });
        document.getElementById(activeButtonId).classList.add('active');
    }

    // Search input handler
    searchInput.addEventListener('input', () => {
        renderTasks();
    });

    // --- Drag and Drop ---
    taskList.addEventListener('dragstart', (e) => {
        draggedItem = e.target.closest('li');
        if (draggedItem) {
            draggedItem.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedItem.getAttribute('data-id'));
        }
    });

    taskList.addEventListener('dragover', (e) => {
        e.preventDefault(); // Allow dropping
        const targetItem = e.target.closest('li');
        if (targetItem && targetItem !== draggedItem) {
            const boundingBox = targetItem.getBoundingClientRect();
            const offset = boundingBox.y + (boundingBox.height / 2);
            if (e.clientY < offset) {
                taskList.insertBefore(draggedItem, targetItem);
            } else {
                taskList.insertBefore(draggedItem, targetItem.nextSibling);
            }
        }
    });

    taskList.addEventListener('dragend', () => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
            // Update tasks array order based on DOM
            const newOrderIds = Array.from(taskList.children).map(li => li.getAttribute('data-id'));
            const reorderedTasks = newOrderIds.map(id => tasks.find(task => task.id === id));
            tasks = reorderedTasks.filter(Boolean);
            saveTasks();
            renderTasks();
        }
    });

    // Initial load on page load
    loadTasks();
});