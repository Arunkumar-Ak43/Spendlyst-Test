
        // Register Service Worker (for PWA capabilities, not strictly needed for WebView APK but good practice)
        if ('serviceWorker' in navigator) {
            // Only register the service worker if running on a web server (http/https), not from a local file.
            if (location.protocol.startsWith('http')) {
                window.addEventListener('load', () => {
                    navigator.serviceWorker.register('spendlyst-sw.js') // Use relative path
                        .then(registration => console.log('ServiceWorker registration successful with scope: ', registration.scope))
                        .catch(err => console.log('ServiceWorker registration failed: ', err));
                });
            }
        }

        // Helper function to convert Blob to Base64 for Android Bridge
        function blobToBase64(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]); // remove data:mime/type;base64,
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }

        // Helper function to get computed CSS variable values
        function getCssVariable(variableName) {
            return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
        }

        // Global variables for data storage
        let incomes = JSON.parse(localStorage.getItem('incomes')) || [];
        let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
        let categories = JSON.parse(localStorage.getItem('categories')) || [];
        let lastResetDate = localStorage.getItem('lastResetDate') || null;
        let resetDayOfMonth = parseInt(localStorage.getItem('resetDayOfMonth')) || 1;
        let enableAutoReset = localStorage.getItem('enableAutoReset') === 'true'; // New preference

        // NEW: Store archived data as an object where keys are "YYYY-MM"
        let archivedMonths = JSON.parse(localStorage.getItem('archivedMonths')) || {};

        // DOM Elements
        const navLinks = document.querySelectorAll('.nav-item');
        const tabContents = document.querySelectorAll('.tab-content');
        const quoteRotator = document.getElementById('quoteRotator');
        const darkModeToggle = document.getElementById('darkModeToggle');

        // Tracker Tab Elements
        const totalIncomeDisplay = document.getElementById('totalIncomeDisplay');
        const totalExpensesDisplay = document.getElementById('totalExpensesDisplay');
        const remainingBalanceDisplay = document.getElementById('remainingBalanceDisplay');
        const remainingPercentageDisplay = document.getElementById('remainingPercentageDisplay');
        const allExpensesList = document.getElementById('allExpensesList');
        const searchAllExpenses = document.getElementById('searchAllExpenses');
        const expensesByCategorySection = document.getElementById('expensesByCategory');

        // Incomes Tab Elements
        const addIncomeForm = document.getElementById('addIncomeForm');
        const incomeSourceInput = document.getElementById('incomeSource');
        const incomeAmountInput = document.getElementById('incomeAmount');
        const incomeHistoryList = document.getElementById('incomeHistoryList');

        // Expenses Tab Elements
        const quickAddExpenseForm = document.getElementById('quickAddExpenseForm');
        const quickExpenseAmountInput = document.getElementById('quickExpenseAmount');
        const quickExpenseCommentInput = document.getElementById('quickExpenseComment');
        const quickAddExpenseCategorySelect = document.getElementById('quickAddExpenseCategory');
        const recentExpensesList = document.getElementById('recentExpensesList');

        // Categories Tab Elements
        const addCategoryForm = document.getElementById('addCategoryForm');
        const categoryNameInput = document.getElementById('categoryName');
        const categoryGoalInput = document.getElementById('categoryGoal');
        const totalGoalPercentageDisplay = document.getElementById('totalGoalPercentageDisplay');
        const manageCategoriesList = document.getElementById('manageCategoriesList');

        // Statistics Tab Elements
        let expensesByCategoryBarChart; // NEW
        const expensesByCategoryBarChartCanvas = document.getElementById('expensesByCategoryBarChart'); // NEW
        const expensesByCategoryBarChartEmpty = document.getElementById('expensesByCategoryBarChartEmpty'); // NEW
        const exportToExcelBtn = document.getElementById('exportToExcelBtn');
        const exportChartPdfBtn = document.getElementById('exportChartPdfBtn');
        const categoryJarsContainer = document.getElementById('categoryJarsContainer'); // NEW

        // Reports Tab Elements
        const reportStartDateInput = document.getElementById('reportStartDate');
        const reportEndDateInput = document.getElementById('reportEndDate');
        const generateReportBtn = document.getElementById('generateReportBtn');
        const exportReportPdfBtn = document.getElementById('exportReportPdfBtn');
        const generatedReportContent = document.getElementById('generatedReportContent');
        const getGoalPlanBtn = document.getElementById('getGoalPlanBtn'); // NEW: Goal Planner Button

        // Settings Tab Elements
        const resetMonthlyBtn = document.getElementById('resetMonthlyBtn');
        const clearArchivedDataBtn = document.getElementById('clearArchivedDataBtn'); // Renamed from clearAllDataBtn
        const resetDayOfMonthInput = document.getElementById('resetDayOfMonth');
        const enableAutoResetCheckbox = document.getElementById('enableAutoReset');
        const archivedMonthsList = document.getElementById('archivedMonthsList'); // NEW: For displaying archived months




        // Modal & Notification Elements
        const notepadEditor = document.getElementById('notepadEditor');
        const notepadBoldBtn = document.getElementById('notepad-bold-btn');
        const notepadUnderlineBtn = document.getElementById('notepad-underline-btn');
        const notepadItalicBtn = document.getElementById('notepad-italic-btn'); // NEW: Italic button
        const notepadIncreaseFontBtn = document.getElementById('notepad-increase-font-btn');
        const notepadDecreaseFontBtn = document.getElementById('notepad-decrease-font-btn');
        const notepadClearFormatBtn = document.getElementById('notepad-clear-format-btn');
        const notepadTextColorPicker = document.getElementById('notepad-text-color-picker');
        const notepadHighlightColorPicker = document.getElementById('notepad-highlight-color-picker');

        let savedNotepadSelection = null; // NEW: To store selection for color pickers

        const notificationModal = document.getElementById('notificationModal');
        const closeNotificationModal = document.getElementById('closeNotificationModal');
        const notificationTitle = document.getElementById('notificationTitle');
        const notificationMessage = document.getElementById('notificationMessage');

        const confirmationModal = document.getElementById('confirmationModal'); // Dedicated confirmation modal
        const confirmModalTitle = document.getElementById('confirmModalTitle');
        const confirmModalMessage = document.getElementById('confirmModalMessage');
        const confirmModalConfirmBtn = document.getElementById('confirmModalConfirmBtn');
        const confirmModalCancelBtn = document.getElementById('confirmModalCancelBtn');
        const closeConfirmationModalBtn = document.getElementById('closeConfirmationModal'); // Close button for confirmation modal
        let debounceTimeout; // For notepad autosave
        let confirmCallback = null; // Callback for confirmation modal

        const geminiTipsModal = document.getElementById('geminiTipsModal');
        const closeGeminiTipsModal = document.getElementById('closeGeminiTipsModal');
        const geminiTipsList = document.getElementById('geminiTipsList');

        const savingsTipsModal = document.getElementById('savingsTipsModal'); // New LLM modal
        const closeSavingsTipsModal = document.getElementById('closeSavingsTipsModal');
        const savingsTipsList = document.getElementById('savingsTipsList');

        // NEW: Goal Planner Modal Elements
        const goalPlannerModal = document.getElementById('goalPlannerModal');
        const closeGoalPlannerModal = document.getElementById('closeGoalPlannerModal');
        const goalInput = document.getElementById('goalInput');
        const generateGoalPlanBtn = document.getElementById('generateGoalPlanBtn');
        const goalPlanOutput = document.getElementById('goalPlanOutput');

        // NEW: Spending Analysis Modal Elements
        const spendingAnalysisModal = document.getElementById('spendingAnalysisModal');
        const closeSpendingAnalysisModal = document.getElementById('closeSpendingAnalysisModal');
        const spendingAnalysisOutput = document.getElementById('spendingAnalysisOutput');

        const notificationBar = document.getElementById('notificationBar');

        // Variables to store filtered report data for PDF export
        let currentReportFilteredIncomes = [];
        let currentReportFilteredExpenses = [];

        // --- Dark Mode Functions ---
        function loadDarkModePreference() {
            const isDarkMode = localStorage.getItem('darkMode') === 'true';
            document.body.classList.toggle('dark-mode', isDarkMode);
            if (isDarkMode) {
                darkModeToggle.innerHTML = '<i data-feather="sun"></i>';
            } else {
                darkModeToggle.innerHTML = '<i data-feather="moon"></i>';
            }
            feather.replace(); // Re-render feather icons after changing
        }

        function toggleDarkMode() {
            document.body.classList.toggle('dark-mode');
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDarkMode);
            if (isDarkMode) {
                darkModeToggle.innerHTML = '<i data-feather="sun"></i>';
            } else {
                darkModeToggle.innerHTML = '<i data-feather="moon"></i>';
            }
            feather.replace(); // Re-render feather icons after changing
            updateCharts(); // Re-render charts to apply new theme colors
        }

        // --- Quote Rotator ---
        const sidebarQuotes = [
            "The art is not in making money, but in keeping it.",
            "Financial goals are the road map that take you to your destination.",
            "It’s not your salary that makes you rich, it’s your spending habits.",
            "A penny saved is a penny earned.",
            "Beware of small expenses; a small leak will sink a great ship.",
            "Compound interest is the eighth wonder of the world. He who understands it, earns it; he who doesn't, pays it."
        ];
        let currentQuoteIndex = 0;
        function rotateQuote() {
            currentQuoteIndex = (currentQuoteIndex + 1) % sidebarQuotes.length;
            quoteRotator.textContent = sidebarQuotes[currentQuoteIndex];
        }

        // --- Ripple Effect for Buttons ---
        function addRippleEffect(buttons) {
            buttons.forEach(button => {
                button.addEventListener('click', function (e) {
                    const ripple = document.createElement('span');
                    ripple.classList.add('ripple');

                    const rect = button.getBoundingClientRect();
                    const size = Math.max(rect.width, rect.height);
                    const x = e.clientX - rect.left - (size / 2);
                    const y = e.clientY - rect.top - (size / 2);

                    ripple.style.width = ripple.style.height = `${size}px`;
                    ripple.style.left = `${x}px`;
                    ripple.style.top = `${y}px`;

                    this.appendChild(ripple);

                    ripple.addEventListener('animationend', () => {
                        ripple.remove();
                    });
                });
            });
        }

        // --- Automatic Monthly Reset Check ---
        function checkForAutomaticMonthlyReset() {
            if (!enableAutoReset) {
                console.log("Automatic monthly reset is disabled.");
                return;
            }

            const today = new Date();
            const currentDay = today.getDate();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            // If no last reset date, set it to the current day and return
            if (!lastResetDate) {
                lastResetDate = new Date().toISOString().split('T')[0];
                saveData();
                console.log("Initial lastResetDate set.");
                return;
            }

            const lastReset = new Date(lastResetDate);
            const lastResetDay = lastReset.getDate();
            const lastResetMonth = lastReset.getMonth();
            const lastResetYear = lastReset.getFullYear();

            // Check if it's a new month AND the current day is the reset day or past it,
            // AND the last reset was NOT in the current month or current year
            if (currentMonth !== lastResetMonth || currentYear !== lastResetYear) {
                if (currentDay >= resetDayOfMonth) {
                    console.log("Performing automatic monthly reset.");
                    resetMonthlyDataAutomatic(); // Call the automatic reset function
                } else {
                    console.log("It's a new month, but not yet the reset day.");
                }
            } else {
                console.log("Still in the same month as last reset.");
            }
        }

        // --- Data Persistence Functions ---
        function saveData() {
            localStorage.setItem('incomes', JSON.stringify(incomes));
            localStorage.setItem('expenses', JSON.stringify(expenses));
            localStorage.setItem('categories', JSON.stringify(categories));
            localStorage.setItem('lastResetDate', lastResetDate);
            localStorage.setItem('resetDayOfMonth', resetDayOfMonth);
            localStorage.setItem('enableAutoReset', enableAutoReset);
            localStorage.setItem('archivedMonths', JSON.stringify(archivedMonths)); // Save archived data
        }

        function loadData(importedData = null) {
            try {
                // If importedData is provided, use it directly. Otherwise, load from localStorage.
                const dataToLoad = importedData ? importedData : {
                    incomes: JSON.parse(localStorage.getItem('incomes')),
                    expenses: JSON.parse(localStorage.getItem('expenses')),
                    categories: JSON.parse(localStorage.getItem('categories')),
                    lastResetDate: localStorage.getItem('lastResetDate'),
                    resetDayOfMonth: localStorage.getItem('resetDayOfMonth'),
                    enableAutoReset: localStorage.getItem('enableAutoReset'),
                    archivedMonths: JSON.parse(localStorage.getItem('archivedMonths'))
                };

                incomes = dataToLoad.incomes || [];
                expenses = dataToLoad.expenses || [];
                categories = dataToLoad.categories || [];
                lastResetDate = dataToLoad.lastResetDate || null;
                resetDayOfMonth = parseInt(dataToLoad.resetDayOfMonth) || 1;
                enableAutoReset = dataToLoad.enableAutoReset !== undefined ? (dataToLoad.enableAutoReset === 'true' || dataToLoad.enableAutoReset === true) : true;
                archivedMonths = dataToLoad.archivedMonths || {}; // Load archived data

                saveData(); // Ensure loaded data is saved back to localStorage consistently
            } catch (error) {
                console.error("Error loading data:", error);
                // Fallback to default data on error
                incomes = [];
                expenses = [];
                categories = [];
                lastResetDate = null;
                resetDayOfMonth = 1;
                enableAutoReset = true;
                archivedMonths = {}; // Clear archived data on error too
                saveData(); // Save the cleared state
                showNotification('Error loading data. Initializing with defaults.', true);
            }
        }

        // --- UI Utility Functions ---
        function showNotification(message, isError = false) {
            // Display notification in HTML
            notificationBar.textContent = message;
            notificationBar.style.backgroundColor = isError ? 'var(--color-danger)' : 'var(--accent-primary)';
            notificationBar.classList.add('active');

            // Also send to Android Toast if bridge exists
            if (window.AndroidBridge && window.AndroidBridge.showAndroidToast) {
                window.AndroidBridge.showAndroidToast(message);
            }

            setTimeout(() => {
                notificationBar.classList.remove('active');
            }, 3000);
        }

        function showConfirmationModal(title, message, onConfirm) {
            confirmModalTitle.textContent = title;
            confirmModalMessage.innerHTML = message;
            confirmCallback = onConfirm;
            confirmationModal.classList.add('active');
        }

        function closeConfirmationModal() {
            confirmationModal.classList.remove('active');
            confirmCallback = null;
        }

        // Event listeners for the confirmation modal's buttons
        confirmModalConfirmBtn.addEventListener('click', () => {
            if (confirmCallback) {
                confirmCallback();
            }
            closeConfirmationModal();
        });

        confirmModalCancelBtn.addEventListener('click', () => {
            closeConfirmationModal();
        });

        closeConfirmationModalBtn.addEventListener('click', () => {
            closeConfirmationModal();
        });

        // --- Core Logic Functions ---

        function calculateTotals() {
            const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
            renderCategoryJars(); // NEW: Update jars when totals change
            const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
            const remainingBalance = totalIncome - totalExpenses;
            const percentage = totalIncome > 0 ? (remainingBalance / totalIncome * 100).toFixed(2) : 0;

            // Animate balance change
            const currentBalance = parseFloat(remainingBalanceDisplay.textContent.replace('₹', ''));
            if (currentBalance !== remainingBalance) {
                if (remainingBalance < currentBalance) {
                    remainingBalanceDisplay.style.color = 'var(--color-danger)';
                } else if (remainingBalance > currentBalance) {
                    remainingBalanceDisplay.style.color = 'var(--accent-primary)';
                }
                setTimeout(() => {
                    remainingBalanceDisplay.style.color = 'var(--text-primary)';
                }, 500); // Reset color after animation
            }

            totalIncomeDisplay.textContent = `₹${totalIncome.toFixed(2)}`;
            totalExpensesDisplay.textContent = `₹${totalExpenses.toFixed(2)}`;
            remainingBalanceDisplay.textContent = `₹${remainingBalance.toFixed(2)}`;
            remainingPercentageDisplay.textContent = `(${percentage}%)`;

            // Update chart data
            updateCharts();
        }

        function renderAllTabs() {
            renderIncomeHistory();
            renderRecentExpenses();
            renderAllExpenses();
            renderCategoriesTab();
            renderExpensesByCategory();
            renderCategoryJars(); // NEW: Render jars on initial load/tab switch
            calculateTotals(); // Also updates charts
            updateCategorySelects();
            renderManageCategoriesList();
            resetDayOfMonthInput.value = resetDayOfMonth;
            enableAutoResetCheckbox.checked = enableAutoReset; // Set checkbox state
            renderArchivedMonthsList(); // NEW: Render archived months list
            loadNotepadContent(); // Load notepad content on initial render

        }
        function loadNotepadContent() {
            notepadEditor.innerHTML = localStorage.getItem('notepadContent') || '';
        }

        // NEW: Function to render category spending jars
        function renderCategoryJars() {
            categoryJarsContainer.innerHTML = '';

            if (categories.length === 0) {
                categoryJarsContainer.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><i data-feather="droplet"></i><p>Define categories to see your spending jars.</p></div>`;
                feather.replace();
                return;
            }

            const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

            categories.forEach(category => {
                const categoryBudget = totalIncome > 0 ? (category.goal / 100) * totalIncome : 0;
                const spentInCategory = expenses
                    .filter(exp => exp.category === category.name)
                    .reduce((sum, exp) => sum + exp.amount, 0);

                let spentPercentage = 0;
                if (categoryBudget > 0) {
                    spentPercentage = (spentInCategory / categoryBudget) * 100;
                } else if (spentInCategory > 0) {
                    spentPercentage = 200; // If no budget but there are expenses, show as way over
                }

                const fillHeight = Math.min(spentPercentage, 100);
                const colorClass = spentPercentage > 100 ? 'jar-fill-over' : 'jar-fill-normal';

                const jarElement = document.createElement('div');
                jarElement.classList.add('category-jar');
                jarElement.innerHTML = `
                    <div class="category-jar-name" title="${category.name}">${category.name}</div>
                    <div class="jar-visual">
                        <div class="jar-fill ${colorClass}" style="height: ${fillHeight}%;"></div>
                    </div>
                    <div class="jar-percentage">${spentPercentage.toFixed(0)}% of Budget</div>
                `;
                categoryJarsContainer.appendChild(jarElement);
            });
        }

        // NEW: Notepad selection helper functions
        function saveNotepadSelection() {
            if (window.getSelection) {
                const sel = window.getSelection();
                if (sel.getRangeAt && sel.rangeCount) {
                    // Check if the selection is inside our editor before saving
                    const range = sel.getRangeAt(0);
                    if (notepadEditor.contains(range.commonAncestorContainer)) {
                        savedNotepadSelection = range;
                    } else {
                        savedNotepadSelection = null;
                    }
                }
            }
        }

        function restoreNotepadSelection() {
            if (savedNotepadSelection) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(savedNotepadSelection);
            }
        }

        function saveNotepadContent() {
            // This function is now debounced
            localStorage.setItem('notepadContent', notepadEditor.innerHTML);
            const notepadSaveStatus = document.getElementById('notepad-save-status');
            if (notepadSaveStatus) {
                notepadSaveStatus.textContent = 'Saved!';
                // The opacity is already 1 from the input event
                setTimeout(() => {
                    notepadSaveStatus.style.opacity = '0';
                }, 1500); // Fade out after 1.5 seconds
            }
        }

        function renderNotepadTab() {
            loadNotepadContent();
        }

        function switchTab(tabId) {
            tabContents.forEach(tab => tab.classList.remove('active'));
            navLinks.forEach(link => link.classList.remove('active'));

            document.getElementById(tabId).classList.add('active');
            document.querySelector(`.nav-item[data-tab="${tabId}"]`).classList.add('active');

            // Re-render charts when statistics tab is active to ensure they are drawn correctly
            if (tabId === 'statistics') {
                updateCharts();
            }
             if (tabId === 'notepad') {
                renderNotepadTab();
            }
        }

        // --- Tracker Tab Functions ---
        function renderAllExpenses() {
            allExpensesList.innerHTML = '';
            const searchTerm = searchAllExpenses.value.toLowerCase();
            const filteredExpenses = expenses.filter(expense =>
                expense.comment.toLowerCase().includes(searchTerm) ||
                expense.category.toLowerCase().includes(searchTerm) ||
                expense.amount.toString().includes(searchTerm)
            );

            if (filteredExpenses.length === 0) {
                allExpensesList.innerHTML = `<div class="empty-state"><i data-feather="coffee"></i><p>No transactions recorded yet.</p></div>`;
                feather.replace();
                return;
            }

            filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

            filteredExpenses.forEach(expense => {
                const listItem = document.createElement('div');
                listItem.classList.add('list-item');
                listItem.innerHTML = `
                    <div class="list-item-content">
                        <strong>₹${expense.amount.toFixed(2)}</strong> - ${expense.comment}
                        <div class="meta-text">${expense.category} | ${new Date(expense.date).toLocaleString()}</div>
                    </div>
                    <div class="list-item-actions">
                        <button class="btn-icon edit-btn" aria-label="Edit expense" data-id="${expense.id}" data-type="expense"><i data-feather="edit"></i></button>
                        <button class="btn-icon delete-btn" aria-label="Delete expense" data-id="${expense.id}" data-type="expense"><i data-feather="trash-2"></i></button>
                    </div>
                `;
                allExpensesList.appendChild(listItem);
            });
            feather.replace();
            addRippleEffect(allExpensesList.querySelectorAll('.btn-icon'));
        }

        function renderExpensesByCategory() {
            expensesByCategorySection.innerHTML = '';
            if (categories.length === 0) {
                expensesByCategorySection.innerHTML = `<div class="empty-state"><i data-feather="tag"></i><p>Define your blends (categories) first.</p></div>`;
                feather.replace();
                return;
            }

            const expensesGroupedByCategory = {};
            categories.forEach(cat => expensesGroupedByCategory[cat.name] = { total: 0, items: [] });

            expenses.forEach(expense => {
                if (expensesGroupedByCategory[expense.category]) {
                    expensesGroupedByCategory[expense.category].total += expense.amount;
                    expensesGroupedByCategory[expense.category].items.push(expense);
                }
            });

            for (const categoryName in expensesGroupedByCategory) {
                const categoryData = expensesGroupedByCategory[categoryName];
                const category = categories.find(cat => cat.name === categoryName);
                const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
                const percentageOfIncome = totalIncome > 0 ? (categoryData.total / totalIncome * 100).toFixed(2) : 0;
                const goalPercentage = category ? category.goal : 0;
                const percentageColor = percentageOfIncome > goalPercentage ? 'var(--color-danger)' : 'var(--accent-primary)';

                const categorySectionDiv = document.createElement('div');
                categorySectionDiv.classList.add('category-section', 'card');
                categorySectionDiv.innerHTML = `
                    <div class="category-header" data-category="${categoryName}">
                        <div class="category-header-info">
                            <h3>${categoryName}</h3>
                            <p class="meta-text">Spent: <strong>₹${categoryData.total.toFixed(2)}}</strong> | Goal: ${goalPercentage}% | Actual: <strong style="color:${percentageColor};">${percentageOfIncome}%</strong></p>
                        </div>
                        <i data-feather="chevron-down"></i>
                    </div>
                    <div class="category-content">
                        <ul id="categoryList-${categoryName.replace(/\s/g, '')}"></ul>
                    </div>
                `;
                expensesByCategorySection.appendChild(categorySectionDiv);

                const categoryList = categorySectionDiv.querySelector(`#categoryList-${categoryName.replace(/\s/g, '')}`);
                if (categoryData.items.length === 0) {
                    categoryList.innerHTML = `<div class="empty-state" style="border:none; padding:1rem;"><p>No expenses in this category yet.</p></div>`;
                } else {
                    categoryData.items.sort((a, b) => new Date(b.date) - new Date(a.date));
                    categoryData.items.forEach(item => {
                        const li = document.createElement('li');
                        li.classList.add('list-item');
                        li.innerHTML = `
                            <div class="list-item-content">
                                <strong>₹${item.amount.toFixed(2)}</strong> - ${item.comment}
                                <div class="meta-text">${new Date(item.date).toLocaleString()}</div>
                            </div>
                            <div class="list-item-actions">
                                <button class="btn-icon edit-btn" aria-label="Edit expense" data-id="${item.id}" data-type="expense"><i data-feather="edit"></i></button>
                                <button class="btn-icon delete-btn" aria-label="Delete expense" data-id="${item.id}" data-type="expense"><i data-feather="trash-2"></i></button>
                            </div>
                        `;
                        categoryList.appendChild(li);
                    });
                }
            }
            feather.replace();
            addRippleEffect(expensesByCategorySection.querySelectorAll('.btn-icon'));

            // Add event listeners for category headers
            expensesByCategorySection.querySelectorAll('.category-header').forEach(header => {
                header.addEventListener('click', () => {
                    const content = header.nextElementSibling;
                    const icon = header.querySelector('.feather');
                    header.classList.toggle('expanded');
                    content.classList.toggle('active');
                    if (icon.getAttribute('data-feather') === 'chevron-down') {
                        icon.setAttribute('data-feather', 'chevron-up');
                    } else {
                        icon.setAttribute('data-feather', 'chevron-down');
                    }
                    feather.replace();
                });
            });
        }

        // --- Incomes Tab Functions ---
        function addIncome(source, amount) {
            const newIncome = {
                id: Date.now(),
                source,
                amount: parseFloat(amount),
                date: new Date().toISOString()
            };
            incomes.push(newIncome);
            saveData();
            renderIncomeHistory();
            calculateTotals();
            showNotification('Income added successfully!');
        }

        function renderIncomeHistory() {
            incomeHistoryList.innerHTML = '';
            if (incomes.length === 0) {
                incomeHistoryList.innerHTML = `<div class="empty-state"><i data-feather="sun"></i><p>No incomes recorded yet.</p></div>`;
                feather.replace();
                return;
            }

            incomes.sort((a, b) => new Date(b.date) - new Date(a.date));

            incomes.forEach(income => {
                const listItem = document.createElement('div');
                listItem.classList.add('list-item');
                listItem.innerHTML = `
                    <div class="list-item-content">
                        <strong>₹${income.amount.toFixed(2)}</strong> - ${income.source}
                        <div class="meta-text">${new Date(income.date).toLocaleString()}</div>
                    </div>
                    <div class="list-item-actions">
                        <button class="btn-icon edit-btn" aria-label="Edit income" data-id="${income.id}" data-type="income"><i data-feather="edit"></i></button>
                        <button class="btn-icon delete-btn" aria-label="Delete income" data-id="${income.id}" data-type="income"><i data-feather="trash-2"></i></button>
                    </div>
                `;
                incomeHistoryList.appendChild(listItem);
            });
            feather.replace();
            addRippleEffect(incomeHistoryList.querySelectorAll('.btn-icon'));
        }

        // --- Expenses Tab Functions ---
        function addExpense(amount, comment, category) {
            const newExpense = {
                id: Date.now(),
                amount: parseFloat(amount),
                comment,
                category,
                date: new Date().toISOString()
            };
            expenses.push(newExpense);
            saveData();
            renderRecentExpenses();
            renderAllExpenses();
            renderExpensesByCategory();
            calculateTotals();
            showNotification('Expense added successfully!');
        }

        function renderRecentExpenses() {
            recentExpensesList.innerHTML = '';
            const today = new Date().toISOString().split('T')[0];
            const recent = expenses.filter(expense => expense.date.startsWith(today));

            if (recent.length === 0) {
                recentExpensesList.innerHTML = `<div class="empty-state"><i data-feather="coffee"></i><p>No sips recorded today.</p></div>`;
                feather.replace();
                return;
            }

            recent.sort((a, b) => new Date(b.date) - new Date(a.date));

            recent.forEach(expense => {
                const listItem = document.createElement('div');
                listItem.classList.add('list-item');
                listItem.innerHTML = `
                    <div class="list-item-content">
                        <strong>₹${expense.amount.toFixed(2)}</strong> - ${expense.comment}
                        <div class="meta-text">${expense.category} | ${new Date(expense.date).toLocaleString()}</div>
                    </div>
                    <div class="list-item-actions">
                        <button class="btn-icon edit-btn" aria-label="Edit expense" data-id="${expense.id}" data-type="expense"><i data-feather="edit"></i></button>
                        <button class="btn-icon delete-btn" aria-label="Delete expense" data-id="${expense.id}" data-type="expense"><i data-feather="trash-2"></i></button>
                    </div>
                `;
                recentExpensesList.appendChild(listItem);
            });
            feather.replace();
            addRippleEffect(recentExpensesList.querySelectorAll('.btn-icon'));
        }

        function updateCategorySelects() {
            quickAddExpenseCategorySelect.innerHTML = '<option value="">Select Category</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.name;
                quickAddExpenseCategorySelect.appendChild(option);
            });
        }

        // --- Categories Tab Functions ---
        function addCategory(name, goal) {
            if (categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
                showNotification('Category with this name already exists!', true);
                return;
            }
            const newCategory = {
                id: Date.now(),
                name,
                goal: parseInt(goal)
            };
            categories.push(newCategory);
            saveData();
            renderCategoriesTab();
            updateCategorySelects();
            showNotification('Category added successfully!');
        }

        function renderCategoriesTab() {
            renderManageCategoriesList();
            updateTotalGoalPercentage();
            renderExpensesByCategory(); // Re-render this section as well
        }

        function renderManageCategoriesList() {
            manageCategoriesList.innerHTML = '';
            if (categories.length === 0) {
                manageCategoriesList.innerHTML = `<div class="empty-state"><i data-feather="tag"></i><p>No blends defined yet.</p></div>`;
                feather.replace();
                return;
            }

            categories.forEach(category => {
                const listItem = document.createElement('div');
                listItem.classList.add('list-item');
                listItem.innerHTML = `
                    <div class="list-item-content">
                        <strong>${category.name}</strong>
                        <div class="meta-text">Target: ${category.goal}%</div>
                    </div>
                    <div class="list-item-actions">
                        <button class="btn-icon edit-btn" aria-label="Edit category" data-id="${category.id}" data-type="category"><i data-feather="edit"></i></button>
                        <button class="btn-icon delete-btn" aria-label="Delete category" data-id="${category.id}" data-type="category"><i data-feather="trash-2"></i></button>
                    </div>
                `;
                manageCategoriesList.appendChild(listItem);
            });
            feather.replace();
            addRippleEffect(manageCategoriesList.querySelectorAll('.btn-icon'));
        }

        function updateTotalGoalPercentage() {
            const totalGoal = categories.reduce((sum, cat) => sum + cat.goal, 0);
            totalGoalPercentageDisplay.textContent = `${totalGoal}%`;
            totalGoalPercentageDisplay.style.color = totalGoal > 100 ? 'var(--color-danger)' : 'var(--accent-primary)';
        }

        // --- Statistics Tab Functions ---
        function updateCharts() {
            // Destroy existing charts if they exist
            if (expensesByCategoryBarChart) { // NEW
                expensesByCategoryBarChart.destroy();
            }

            const fontFamily = getCssVariable('--font-body');
            const textColorPrimary = getCssVariable('--text-primary');
            const textColorSecondary = getCssVariable('--text-secondary');
            const borderColor = getCssVariable('--border-color');
            const accentPrimary = getCssVariable('--accent-primary');

            // Expenses by Category Chart
            const categoryLabels = categories.map(cat => cat.name);
            const categoryData = categoryLabels.map(label => {
                return expenses.filter(exp => exp.category === label).reduce((sum, exp) => sum + exp.amount, 0);
            });

            if (categoryLabels.length === 0 || categoryData.every(d => d === 0)) {
                expensesByCategoryBarChartCanvas.style.display = 'none'; // NEW
                expensesByCategoryBarChartEmpty.style.display = 'block'; // NEW
                exportToExcelBtn.disabled = true;
                exportChartPdfBtn.disabled = true;
			} else {
                expensesByCategoryBarChartCanvas.style.display = 'block'; // NEW
                expensesByCategoryBarChartEmpty.style.display = 'none'; // NEW
                exportToExcelBtn.disabled = false;
                exportChartPdfBtn.disabled = false;

                // NEW: Expenses by Category Bar Chart
                expensesByCategoryBarChart = new Chart(expensesByCategoryBarChartCanvas, {
                    type: 'bar',
                    data: {
                        labels: categoryLabels,
                        datasets: [{
                            label: 'Expenses (₹)',
                            data: categoryData,
                            backgroundColor: [
                                'rgba(142, 68, 173, 0.7)',
                                'rgba(243, 156, 18, 0.7)',
                                'rgba(46, 204, 113, 0.7)',
                                'rgba(231, 76, 60, 0.7)',
                                'rgba(52, 152, 219, 0.7)',
                                'rgba(155, 89, 182, 0.7)',
                                'rgba(26, 188, 156, 0.7)',
                                'rgba(211, 84, 0, 0.7)'
                            ],
                            borderColor: [
                                'rgba(142, 68, 173, 1)',
                                'rgba(243, 156, 18, 1)',
                                'rgba(46, 204, 113, 1)',
                                'rgba(231, 76, 60, 1)',
                                'rgba(52, 152, 219, 1)',
                                'rgba(155, 89, 182, 1)',
                                'rgba(26, 188, 156, 1)',
                                'rgba(211, 84, 0, 1)'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        indexAxis: 'y', // Makes it a horizontal bar chart, which is often better for category names
                        responsive: true,
                        plugins: {
                            legend: {
                                display: false // Hide legend as it's redundant for a single dataset
                            }
                        },
                        scales: {
                            x: {
                                beginAtZero: true,
                                ticks: {
                                    color: textColorSecondary,
                                    font: { family: fontFamily }
                                },
                                grid: { color: borderColor }
                            },
                            y: {
                                ticks: { color: textColorPrimary, font: { family: fontFamily } },
                                grid: { display: false }
                            }
                        }
                    }
                });
            }

        }

        // --- Reports Tab Functions ---
        function generateReport(startDate, endDate) {
            generatedReportContent.innerHTML = '';

            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;

            currentReportFilteredIncomes = incomes.filter(income => {
                const incomeDate = new Date(income.date);
                return (!start || incomeDate >= start) && (!end || incomeDate <= end);
            });

            currentReportFilteredExpenses = expenses.filter(expense => {
                const expenseDate = new Date(expense.date);
                return (!start || expenseDate >= start) && (!end || expenseDate <= end);
            });

            if (currentReportFilteredIncomes.length === 0 && currentReportFilteredExpenses.length === 0) {
                generatedReportContent.innerHTML = `<div class="empty-state"><i data-feather="clipboard"></i><p>No data for the selected period.</p></div>`;
                exportReportPdfBtn.disabled = true; // Disable PDF export if no data
                feather.replace();
                return;
            }

            exportReportPdfBtn.disabled = false; // Enable PDF export if there is data

            let reportHtml = `
                <div class="card">
                    <h3>Income Summary</h3>
                    <ul class="list-container">
            `;
            if (currentReportFilteredIncomes.length === 0) {
                reportHtml += `<div class="empty-state" style="border:none; padding:1rem;"><p>No incomes in this period.</p></div>`;
            } else {
                currentReportFilteredIncomes.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(income => {
                    reportHtml += `
                        <li class="list-item">
                            <div class="list-item-content">
                                <strong>₹${income.amount.toFixed(2)}</strong> - ${income.source}
                                <div class="meta-text">${new Date(income.date).toLocaleString()}</div>
                            </div>
                        </li>
                    `;
                });
            }
            reportHtml += `</ul></div>`;

            reportHtml += `
                <div class="card">
                    <h3>Expense Summary</h3>
                    <ul class="list-container">
            `;
            if (currentReportFilteredExpenses.length === 0) {
                reportHtml += `<div class="empty-state" style="border:none; padding:1rem;"><p>No expenses in this period.</p></div>`;
            } else {
                currentReportFilteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(expense => {
                    const expenseDate = new Date(expense.date);
                    reportHtml += `
                        <li class="list-item">
                            <div class="list-item-content">
                                <strong>₹${expense.amount.toFixed(2)}</strong> - ${expense.comment}
                                <div class="meta-text">${expense.category} | ${expenseDate.toLocaleString()}</div>
                            </div>
                        </li>
                    `;
                });
            }
            reportHtml += `</ul></div>`;

            const totalIncome = currentReportFilteredIncomes.reduce((sum, income) => sum + income.amount, 0);
            const totalExpenses = currentReportFilteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
            const balance = totalIncome - totalExpenses;

            reportHtml += `
                <div class="card financial-overview" style="grid-template-columns: 1fr;">
                    <div class="overview-card">
                        <h4>Period Income</h4>
                        <p class="amount">₹${totalIncome.toFixed(2)}</p>
                    </div>
                    <div class="overview-card">
                        <h4>Period Expenses</h4>
                        <p class="amount">₹${totalExpenses.toFixed(2)}</p>
                    </div>
                    <div class="overview-card">
                        <h4>Period Balance</h4>
                        <p class="amount">₹${balance.toFixed(2)}</p>
                    </div>
                </div>
            `;

            generatedReportContent.innerHTML = reportHtml;
            feather.replace();
        }

        function exportReportToPdf() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            doc.setFont('helvetica');
            doc.setFontSize(18);
            doc.text("Spendlyst Custom Report", 14, 22);
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

            let yPos = 40;

            // Income Table
            const incomeHeaders = [['Date', 'Source', 'Amount (Rs.)']];
            const incomeData = currentReportFilteredIncomes.map(income => [
                new Date(income.date).toLocaleString(),
                income.source,
                `Rs. ${income.amount.toFixed(2)}`
            ]);

            if (incomeData.length > 0) {
                doc.setFontSize(14);
                doc.setTextColor(getCssVariable('--text-primary'));
                doc.text("Income Summary", 14, yPos);
                yPos += 5;
                doc.autoTable({
                    startY: yPos,
                    head: incomeHeaders,
                    body: incomeData,
                    theme: 'striped',
                    headStyles: { fillColor: [parseInt(getCssVariable('--accent-primary-rgb').split(',')[0]), parseInt(getCssVariable('--accent-primary-rgb').split(',')[1]), parseInt(getCssVariable('--accent-primary-rgb').split(',')[2])] },
                    styles: { font: 'helvetica', textColor: getCssVariable('--text-primary') },
                    margin: { top: 10, left: 14, right: 14 },
                    didDrawPage: function (data) {
                        yPos = data.cursor.y + 10; // Update yPos for next table
                    }
                });
            } else {
                doc.setFontSize(12);
                doc.setTextColor(getCssVariable('--text-secondary'));
                doc.text("No incomes in this period.", 14, yPos);
                yPos += 10;
            }

            // Expense Table
            const expenseHeaders = [['Date', 'Category', 'Description', 'Amount (Rs.)']];
            const expenseData = currentReportFilteredExpenses.map(expense => [
                new Date(expense.date).toLocaleString(),
                expense.category,
                expense.comment,
                `Rs. ${expense.amount.toFixed(2)}`
            ]);

            if (expenseData.length > 0) {
                // Add a new page if current content is too long
                if (yPos + 50 > doc.internal.pageSize.height) { // Estimate space needed for table title + a few rows
                    doc.addPage();
                    yPos = 20; // Reset yPos for new page
                }

                doc.setFontSize(14);
                doc.setTextColor(getCssVariable('--text-primary'));
                doc.text("Expense Summary", 14, yPos);
                yPos += 5;
                doc.autoTable({
                    startY: yPos,
                    head: expenseHeaders,
                    body: expenseData,
                    theme: 'striped',
                    headStyles: { fillColor: [parseInt(getCssVariable('--accent-primary-rgb').split(',')[0]), parseInt(getCssVariable('--accent-primary-rgb').split(',')[1]), parseInt(getCssVariable('--accent-primary-rgb').split(',')[2])] },
                    styles: { font: 'helvetica', textColor: textColorPrimary },
                    margin: { top: 10, left: 14, right: 14 },
                    didDrawPage: function (data) {
                        yPos = data.cursor.y + 10; // Update yPos for next content
                    }
                });
            } else {
                // Add a new page if current content is too long
                if (yPos + 20 > doc.internal.pageSize.height) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.setFontSize(12);
                doc.setTextColor(getCssVariable('--text-secondary'));
                doc.text("No expense details available.", 14, yPos);
                yPos += 10;
            }

            // Summary Totals
            const totalIncome = currentReportFilteredIncomes.reduce((sum, income) => sum + income.amount, 0);
            const totalExpenses = currentReportFilteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
            const balance = totalIncome - totalExpenses;

            doc.setFontSize(14);
            doc.setTextColor(getCssVariable('--text-primary'));
            doc.text("Financial Summary", 14, yPos + 10);
            doc.setFontSize(12);
            doc.setTextColor(getCssVariable('--text-secondary'));
            doc.text(`Total Income: Rs. ${totalIncome.toFixed(2)}`, 14, yPos + 20);
            doc.text(`Total Expenses: Rs. ${totalExpenses.toFixed(2)}`, 14, yPos + 27);
            doc.text(`Period Balance: Rs. ${balance.toFixed(2)}`, 14, yPos + 34);

            // Instead of doc.save(), open in new tab
            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            window.open(pdfUrl, '_blank');
            // Revoke the object URL after a short delay
            setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
            showNotification('Report opened in new tab for download!');
        }

        // --- Settings Tab Functions ---




        // NEW: Function to archive current month's data
        function archiveCurrentMonthData(pdfBlob) { // Made async to handle file reading, now accepts a blob
            return new Promise((resolve, reject) => {
                const today = new Date();
                const currentMonthKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;

                if (incomes.length === 0 && expenses.length === 0) {
                    resolve(); // Nothing to archive, resolve immediately
                    return;
                }

                const reader = new FileReader();
                reader.readAsDataURL(pdfBlob);
                reader.onloadend = function() {
                    const base64data = reader.result;
                    archivedMonths[currentMonthKey] = {
                        incomes: [...incomes],
                        expenses: [...expenses],
                        pdfData: base64data.split(',')[1], // Store base64 data instead of a temporary URL
                        timestamp: new Date().toISOString()
                    };
                    resolve(); // Resolve after data is prepared
                };
                reader.onerror = (error) => reject(error);
            });
        }

        function generateArchivedPdf(incomeData, expenseData) {
            try { // Add a try-catch block for better error diagnostics
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();

                const fontFamily = getCssVariable('--font-body');
                const textColorPrimary = getCssVariable('--text-primary');
                const textColorSecondary = getCssVariable('--text-secondary');
                const borderColor = getCssVariable('--border-color');
                const accentPrimary = getCssVariable('--accent-primary');


                doc.setFont('helvetica');
                doc.setFontSize(18);
                doc.text("Spendlyst Archived Financial Report", 14, 22); // Changed app name
                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

                let yPos = 40;


                // Income Table
                const incomeHeaders = [['Date', 'Source', 'Amount (Rs.)']];
                const incomeTableData = incomeData.map(income => [
                    new Date(income.date).toLocaleString(),
                    income.source,
                    `Rs. ${income.amount.toFixed(2)}`
                ]);

                if (incomeTableData.length > 0) {
                    doc.setFontSize(14);
                    doc.setTextColor(textColorPrimary); // Use variable
                    doc.text("Income Summary", 14, yPos);
                    yPos += 5;
                    doc.autoTable({
                        startY: yPos,
                        head: incomeHeaders,
                        body: incomeTableData,
                        theme: 'striped',
                        headStyles: { fillColor: [parseInt(getCssVariable('--accent-primary-rgb').split(',')[0]), parseInt(getCssVariable('--accent-primary-rgb').split(',')[1]), parseInt(getCssVariable('--accent-primary-rgb').split(',')[2])] },
                        styles: { font: 'helvetica', textColor: textColorPrimary },
                        margin: { top: 10, left: 14, right: 14 },
                        didDrawPage: function (data) {
                            yPos = data.cursor.y + 10; // Update yPos for next table
                        }
                    });
                } else {
                    doc.setFontSize(12);
                    doc.setTextColor(textColorSecondary);
                    doc.text("No incomes in this period.", 14, yPos);
                    yPos += 10;
                }

                // Expense Table
                const expenseHeaders = [['Date', 'Category', 'Description', 'Amount (Rs.)']];
                const expenseTableData = expenseData.map(expense => [
                    new Date(expense.date).toLocaleString(),
                    expense.category,
                    expense.comment,
                    `Rs. ${expense.amount.toFixed(2)}`
                ]);

                if (expenseTableData.length > 0) {
                    // Add a new page if current content is too long
                    if (yPos + 50 > doc.internal.pageSize.height) { // Estimate space needed for table title + a few rows
                        doc.addPage();
                        yPos = 20; // Reset yPos for new page
                    }

                    doc.setFontSize(14);
                    doc.setTextColor(textColorPrimary);
                    doc.text("Expense Summary", 14, yPos);
                    yPos += 5;
                    doc.autoTable({
                        startY: yPos,
                        head: expenseHeaders,
                        body: expenseTableData,
                        theme: 'striped',
                        headStyles: { fillColor: [parseInt(getCssVariable('--accent-primary-rgb').split(',')[0]), parseInt(getCssVariable('--accent-primary-rgb').split(',')[1]), parseInt(getCssVariable('--accent-primary-rgb').split(',')[2])] },
                        styles: { font: 'helvetica', textColor: textColorPrimary },
                        margin: { top: 10, left: 14, right: 14 },
                        didDrawPage: function (data) {
                            yPos = data.cursor.y + 10; // Update yPos for next content
                        }
                    });
                } else {
                    // Add a new page if current content is too long
                    if (yPos + 20 > doc.internal.pageSize.height) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.setFontSize(12);
                    doc.setTextColor(textColorSecondary);
                    doc.text("No expense details available.", 14, yPos);
                    yPos += 10;
                }

                // NEW: Category Analysis Table
                const totalIncomeForAnalysis = incomeData.reduce((sum, income) => sum + income.amount, 0);
                const categoryAnalysisHeaders = [['Category', 'Target %', 'Actual %', 'Status']];
                const categoryAnalysisData = categories.map(category => {
                    const spentInCategory = expenseData
                        .filter(exp => exp.category === category.name)
                        .reduce((sum, exp) => sum + exp.amount, 0);

                    const actualPercentage = totalIncomeForAnalysis > 0 ? (spentInCategory / totalIncomeForAnalysis * 100) : 0;

                    let status = 'On Track';
                    if (spentInCategory === 0) {
                        status = 'No Spending';
                    } else if (actualPercentage > category.goal) {
                        status = 'Over Budget';
                    }

                    return [
                        category.name,
                        `${category.goal}%`,
                        `${actualPercentage.toFixed(2)}%`,
                        status
                    ];
                });

                if (categoryAnalysisData.length > 0) {
                    if (yPos + 50 > doc.internal.pageSize.height) { doc.addPage(); yPos = 20; }
                    doc.setFontSize(14);
                    doc.setTextColor(textColorPrimary);
                    doc.text("Category Spending Analysis", 14, yPos);
                    yPos += 5;
                    doc.autoTable({
                        startY: yPos,
                        head: categoryAnalysisHeaders,
                        body: categoryAnalysisData,
                        theme: 'striped',
                        headStyles: { fillColor: [parseInt(getCssVariable('--accent-primary-rgb').split(',')[0]), parseInt(getCssVariable('--accent-primary-rgb').split(',')[1]), parseInt(getCssVariable('--accent-primary-rgb').split(',')[2])] },
                        styles: { font: 'helvetica', textColor: textColorPrimary },
                        margin: { top: 10, left: 14, right: 14 },
                        didDrawPage: function (data) {
                            yPos = data.cursor.y + 10;
                        }
                    });
                } else {
                    if (yPos + 20 > doc.internal.pageSize.height) { doc.addPage(); yPos = 20; }
                    doc.setFontSize(12);
                    doc.setTextColor(textColorSecondary);
                    doc.text("No category data to analyze.", 14, yPos);
                    yPos += 10;
                }

                // NEW: Add Visual Statistics Data Table
                const statsHeaders = [['Category', 'Amount Spent (Rs.)']];
                const statsData = categories.map(cat => {
                    const amountSpent = expenseData
                        .filter(exp => exp.category === cat.name)
                        .reduce((sum, exp) => sum + exp.amount, 0);
                    return [cat.name, `Rs. ${amountSpent.toFixed(2)}`];
                }).filter(row => parseFloat(row[1].replace('Rs. ', '')) > 0); // Only show categories with spending

                if (statsData.length > 0) {
                    if (yPos + 50 > doc.internal.pageSize.height) { doc.addPage(); yPos = 20; }
                    doc.setFontSize(12);
                    doc.setTextColor(textColorPrimary);
                    doc.text("Spending by Category (Data)", 14, yPos);
                    yPos += 5;
                    doc.autoTable({
                        startY: yPos,
                        head: statsHeaders,
                        body: statsData,
                        theme: 'grid',
                        headStyles: { fillColor: [149, 165, 166] }, // --accent-secondary color
                        styles: { font: 'helvetica', textColor: textColorPrimary },
                        margin: { top: 10, left: 14, right: 14 },
                        didDrawPage: function (data) { yPos = data.cursor.y + 10; }
                    });
                }

                // Summary Totals
                if (yPos + 40 > doc.internal.pageSize.height) { doc.addPage(); yPos = 20; }
                const totalIncome = incomeData.reduce((sum, income) => sum + income.amount, 0);
                const totalExpenses = expenseData.reduce((sum, expense) => sum + expense.amount, 0);
                const balance = totalIncome - totalExpenses;

                doc.setFontSize(14);
                doc.setTextColor(textColorPrimary);
                doc.text("Financial Summary", 14, yPos);
                yPos += 10;
                doc.setFontSize(12);
                doc.setTextColor(textColorSecondary);
                doc.text(`Total Income: Rs. ${totalIncome.toFixed(2)}`, 14, yPos);
                yPos += 7;
                doc.text(`Total Expenses: Rs. ${totalExpenses.toFixed(2)}`, 14, yPos);
                yPos += 7;
                doc.text(`Period Balance: Rs. ${balance.toFixed(2)}`, 14, yPos);

                // Convert the PDF to a Blob
                const pdfBlob = doc.output('blob');
                return pdfBlob;
            } catch (e) {
                console.error("Error during PDF generation in generateArchivedPdf:", e);
                return null; // Return null on failure
            }
        }

        async function resetMonthlyData() {
            showConfirmationModal(
                'Confirm Monthly Reset',
                'This will save the current month\'s data as a downloadable PDF, archive it, and then clear all current transactions. Are you sure you want to continue?',
                async () => {
                    try {
                        if (incomes.length === 0 && expenses.length === 0) {
                            showNotification('No data to reset.');
                            return;
                        }

                        // Step 1: Generate the PDF blob.
                        const pdfBlob = generateArchivedPdf(incomes, expenses);
                        if (!pdfBlob) {
                            throw new Error("PDF Blob generation failed.");
                        }

                        // Step 2: Trigger the download using a data URI, which our WebView will catch.
                        const readerForDownload = new FileReader();
                        readerForDownload.readAsDataURL(pdfBlob);
                        readerForDownload.onloadend = function() {
                            const dataUrl = readerForDownload.result;
                            const a = document.createElement('a');
                            a.href = dataUrl;
                            a.download = `Spendlyst_Archive_${new Date().toISOString().slice(0, 10)}.pdf`;
                            a.click();
                        };

                        // Step 3: Archive the data using the same blob.
                        await archiveCurrentMonthData(pdfBlob);

                        // Step 4: Clear current data and update UI.
                        incomes = [];
                        expenses = [];
                        lastResetDate = new Date().toISOString().split('T')[0];
                        saveData();
                        renderAllTabs();
                        showNotification('Current month\'s data has been archived and reset.');
                    } catch (error) {
                        console.error("Failed to archive data:", error);
                        showNotification("Error: Could not archive data.", true);
                    }
                }
            );
        }

        async function resetMonthlyDataAutomatic() {
            try {
                // Generate blob for archiving
                const pdfBlob = generateArchivedPdf(incomes, expenses);
                await archiveCurrentMonthData(pdfBlob); // Pass the blob
                incomes = []; // Clear current incomes
                expenses = []; // Clear current expenses
                lastResetDate = new Date().toISOString().split('T')[0];
                saveData();
                renderAllTabs();
                showNotification('Monthly data automatically archived and reset!');
            } catch (error) {
                console.error("Failed to auto-archive data:", error);
                showNotification("Error: Could not automatically archive data.", true);
            }
        }

        // NEW: Function to render archived months list
        function renderArchivedMonthsList() {
            archivedMonthsList.innerHTML = '';

            const sortedArchivedKeys = Object.keys(archivedMonths).sort((a, b) => {
                // Sort by year-month descending
                return b.localeCompare(a);
            });

            if (sortedArchivedKeys.length === 0) {
                archivedMonthsList.innerHTML = `<div class="empty-state"><i data-feather="archive"></i><p>No archived data yet.</p></div>`;
                feather.replace();
                return;
            }

            sortedArchivedKeys.forEach(monthKey => {
                const [year, monthNum] = monthKey.split('-');
                const monthName = new Date(year, parseInt(monthNum) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                const archivedDataForMonth = archivedMonths[monthKey];
                const totalArchivedIncomes = archivedDataForMonth.incomes.reduce((sum, i) => sum + i.amount, 0);
                const totalArchivedExpenses = archivedDataForMonth.expenses.reduce((sum, e) => sum + e.amount, 0);


                const listItem = document.createElement('div');
                listItem.classList.add('list-item');
                listItem.dataset.monthKey = monthKey; // Store month key for deletion
                listItem.innerHTML = `
                    <div class="list-item-content">
                        <strong>${monthName}</strong>
                        <div class="meta-text">Incomes: Rs. ${totalArchivedIncomes.toFixed(2)} | Expenses: Rs. ${totalArchivedExpenses.toFixed(2)}</div>
                    </div>

                    <div class="list-item-actions">
                        <button class="btn-icon download-archived-month-btn" data-month-key="${monthKey}" aria-label="Download archived report"><i data-feather="download"></i></button>
                        <button class="btn-icon delete-archived-month-btn" data-month-key="${monthKey}"><i data-feather="trash-2"></i></button>
                    </div>
                `;
                archivedMonthsList.appendChild(listItem);

            });
            feather.replace();
            addRippleEffect(archivedMonthsList.querySelectorAll('.btn-icon'));
        }

        // NEW: Event listener for month-wise archived data deletion
        document.addEventListener('click', (e) => {
            const target = e.target.closest('.delete-archived-month-btn');
            if (target) {
                const monthKey = target.dataset.monthKey;
                const listItem = target.closest('.list-item');

                showConfirmationModal(
                    'Confirm Delete Archived Month',
                    `Are you sure you want to delete the archived data for <strong>${monthKey}</strong>? This cannot be undone.`,
                    () => {
                        if (archivedMonths.hasOwnProperty(monthKey)) {
                            // Add fade-out animation before removal
                            if (listItem) {
                                listItem.classList.add('fade-out');
                                listItem.addEventListener('animationend', () => {
                                    delete archivedMonths[monthKey];
                                    saveData();
                                    renderArchivedMonthsList(); // Re-render the list after animation
                                });
                            } else { // Fallback if no list item found (shouldn't happen)
                                delete archivedMonths[monthKey];
                                saveData();
                                renderArchivedMonthsList();
                            }
                            showNotification(`Archived data for ${monthKey} deleted.`);
                        } else {
                            showNotification(`No archive found for ${monthKey}.`, true);
                        }
                    }
                );
            }
        });

        // Event listener for downloading archived PDFs
        document.addEventListener('click', (e) => {
            const target = e.target.closest('.download-archived-month-btn');
            if (target) {
                const monthKey = target.dataset.monthKey;
                const archivedData = archivedMonths[monthKey];
                if (archivedData && archivedData.pdfData) {
                    const dataUrl = `data:application/pdf;base64,${archivedData.pdfData}`;
                    const a = document.createElement('a');
                    a.href = dataUrl;
                    a.download = `Spendlyst_Archive_${monthKey}.pdf`;
                    a.click();
                } else {
                    showNotification('Could not find PDF data for this archive.', true);
                }
            }
        });


        // Modified clearArchivedDataBtn to only clear the archivedMonths object
        clearArchivedDataBtn.addEventListener('click', () => {
            showConfirmationModal(
                'Confirm Clear ALL Archived Data',
                'Are you sure you want to clear ALL your historical/archived data? This action cannot be undone.',
                () => {
                    archivedMonths = {}; // Clear the entire archive object
                    saveData();
                    renderArchivedMonthsList(); // Re-render the list
                    showNotification('All archived data cleared successfully!', true);
                }
            );
        });

        resetDayOfMonthInput.addEventListener('change', (e) => {
            resetDayOfMonth = parseInt(e.target.value);
            saveData();
            showNotification(`Monthly reset day set to ${resetDayOfMonth}.`);
        });
        // New event listener for auto-reset checkbox
        enableAutoResetCheckbox.addEventListener('change', (e) => {
            enableAutoReset = e.target.checked;
            saveData();
            showNotification(`Automatic monthly reset ${enableAutoReset ? 'enabled' : 'disabled'}.`);
        });

        // Close modal events for LLM modals
        closeGeminiTipsModal.addEventListener('click', () => geminiTipsModal.classList.remove('active'));
        closeSavingsTipsModal.addEventListener('click', () => savingsTipsModal.classList.remove('active'));
        closeGoalPlannerModal.addEventListener('click', () => goalPlannerModal.classList.remove('active')); // NEW
        closeSpendingAnalysisModal.addEventListener('click', () => spendingAnalysisModal.classList.remove('active')); // NEW

        window.addEventListener('click', (event) => {
            if (event.target === geminiTipsModal) {
                geminiTipsModal.classList.remove('active');
            }
            if (event.target === savingsTipsModal) {
                savingsTipsModal.classList.remove('active');
            }
            if (event.target === goalPlannerModal) { // NEW
                goalPlannerModal.classList.remove('active');
            }
            if (event.target === spendingAnalysisModal) { // NEW
                spendingAnalysisModal.classList.remove('active');
            }
            // The confirmation modal now has its own close button, so clicking outside won't close it by default.
            /*
            if (event.target === confirmationModal) {
                closeConfirmationModal();
            }
            */
        });
        // --- Check for Network Connection ---
        function isOnline() {
            return navigator.onLine;
        }

        // --- Event Listeners ---
        document.addEventListener('DOMContentLoaded', () => {
            feather.replace(); // Moved to the top to ensure icons are rendered first
            loadDarkModePreference();
            loadData();
            checkForAutomaticMonthlyReset();
            switchTab('tracker'); // Default to tracker tab
            renderAllTabs(); // Initial render of all dynamic content

            // Set up quote rotator
            setInterval(rotateQuote, 8000); // Rotate every 8 seconds

            // Add ripple effect to all buttons
            addRippleEffect(document.querySelectorAll('.btn'));
            // Navigation
            navLinks.forEach(link => {
                link.addEventListener('mousedown', (e) => { // Use mousedown to save before tab switch logic
                    saveNotepadContent();
                    e.preventDefault();
                    const tabId = link.dataset.tab;
                    switchTab(tabId);
                });
            });
            // Dark Mode Toggle
            darkModeToggle.addEventListener('click', toggleDarkMode);
            // Tracker Tab
            searchAllExpenses.addEventListener('input', renderAllExpenses);

            // Centralized event listener for edit/delete actions using event delegation
            document.querySelector('.main-content').addEventListener('click', (e) => {
                const target = e.target.closest('.btn-icon.edit-btn, .btn-icon.delete-btn');
                if (!target) return;

                const id = parseInt(target.dataset.id);
                const type = target.dataset.type;

                if (target.classList.contains('delete-btn')) {
                    // Prevent deleting a category if it's in use
                    if (type === 'category') {
                        const categoryToDelete = categories.find(cat => cat.id === id);
                        if (categoryToDelete && expenses.some(exp => exp.category === categoryToDelete.name)) {
                            showNotification('Cannot delete category. It is in use by one or more expenses.', true);
                            return;
                        }
                    }

                    showConfirmationModal('Confirm Deletion', 'Are you sure you want to permanently delete this item?', () => {
                        // Add fade-out animation before deleting
                        const listItem = target.closest('.list-item');
                        
                        const performDelete = () => {
                            if (type === 'expense') {
                                expenses = expenses.filter(exp => exp.id !== id);
                                showNotification('Expense deleted successfully!');
                            } else if (type === 'income') {
                                incomes = incomes.filter(inc => inc.id !== id);
                                showNotification('Income deleted successfully!');
                            } else if (type === 'category') {
                                categories = categories.filter(cat => cat.id !== id);
                                showNotification('Category deleted successfully!');
                            }
                            saveData();
                            renderAllTabs();
                        };

                        if (listItem) {
                            listItem.classList.add('fade-out');
                            listItem.addEventListener('animationend', performDelete, { once: true });
                        } else {
                            performDelete();
                        }
                    });
                } else if (target.classList.contains('edit-btn')) {
                    // Handle edit logic (could open a pre-filled form modal)
                    let itemToEdit;
                    let formHtml = ''; 
                    let updateFunction = () => {}; // Initialize as an empty function
                    if (type === 'expense') {
                        itemToEdit = expenses.find(exp => exp.id === id);
                        if (!itemToEdit) return;
                        formHtml = `
                            <div class="form-group">
                                <label for="editExpenseAmount">Amount (₹)</label>
                                <input type="number" id="editExpenseAmount" step="0.01" value="${itemToEdit.amount}" required>
                            </div>
                            <div class="form-group">
                                <label for="editExpenseComment">Comment</label>
                                <input type="text" id="editExpenseComment" value="${itemToEdit.comment}">
                            </div>
                            <div class="form-group">
                                <label for="editExpenseCategory">Category</label>
                                <select id="editExpenseCategory" required></select>
                            </div>
                        `;
                        updateFunction = () => {
                            itemToEdit.amount = parseFloat(document.getElementById('editExpenseAmount').value);
                            itemToEdit.comment = document.getElementById('editExpenseComment').value;
                            itemToEdit.category = document.getElementById('editExpenseCategory').value;
                            showNotification('Expense updated successfully!');
                            return true; // Indicate success
                        };
                    } else if (type === 'income') {
                        itemToEdit = incomes.find(inc => inc.id === id);
                        if (!itemToEdit) return;
                        formHtml = `
                            <div class="form-group">
                                <label for="editIncomeSource">Source</label>
                                <input type="text" id="editIncomeSource" value="${itemToEdit.source}" required>
                            </div>
                            <div class="form-group">
                                <label for="editIncomeAmount">Amount (₹)</label>
                                <input type="number" id="editIncomeAmount" step="0.01" value="${itemToEdit.amount}" required>
                            </div>
                        `;
                        updateFunction = () => {
                            itemToEdit.source = document.getElementById('editIncomeSource').value;
                            itemToEdit.amount = parseFloat(document.getElementById('editIncomeAmount').value);
                            showNotification('Income updated successfully!');
                            return true; // Indicate success
                        };
                    } else if (type === 'category') {
                        itemToEdit = categories.find(cat => cat.id === id);
                        if (!itemToEdit) return;
                        formHtml = `
                            <div class="form-group">
                                <label for="editCategoryName">Category Name</label>
                                <input type="text" id="editCategoryName" value="${itemToEdit.name}" required>
                            </div>
                            <div class="form-group">
                                <label for="editCategoryGoal">Target % of Income</label>
                                <input type="number" id="editCategoryGoal" min="0" max="100" step="1" value="${itemToEdit.goal}" required>
                            </div>
                        `;
                        updateFunction = () => {
                            const newName = document.getElementById('editCategoryName').value;
                            // Prevent changing category name to an existing one (except itself)
                            if (categories.some(cat => cat.name.toLowerCase() === newName.toLowerCase() && cat.id !== id)) {
                                showNotification('Category with this name already exists!', true);
                                return false; // Prevent update
                            }
                            // Update category name in expenses if changed
                            if (itemToEdit.name !== newName) {
                                expenses.forEach(exp => {
                                    if (exp.category === itemToEdit.name) {
                                        exp.category = newName;
                                    }
                                });
                            }
                            itemToEdit.name = newName;
                            itemToEdit.goal = parseInt(document.getElementById('editCategoryGoal').value);
                            showNotification('Category updated successfully!');
                            return true; // Allow update
                        };
                    }
 
                    showConfirmationModal(`Edit ${type.charAt(0).toUpperCase() + type.slice(1)}`, formHtml, () => {
                        if (updateFunction()) { // Execute update function
                            saveData();
                            renderAllTabs();
                        }
                    });
 
                    if (type === 'expense') {
                        const editCategorySelect = document.getElementById('editExpenseCategory');
                        categories.forEach(category => {
                            const option = document.createElement('option');
                            option.value = category.name;
                            option.textContent = category.name;
                            editCategorySelect.appendChild(option);
                        });
                        editCategorySelect.value = itemToEdit.category;
                    }
                }
            });
            // Incomes Tab
            addIncomeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const source = incomeSourceInput.value.trim();
                const amount = incomeAmountInput.value;
                if (source && amount) {
                    addIncome(source, amount);
                    addIncomeForm.reset();
                } else {
                    showNotification('Please fill in all income fields.', true);
                }
            });
            // Expenses Tab
            quickAddExpenseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const amount = quickExpenseAmountInput.value;
                const comment = quickExpenseCommentInput.value.trim();
                const category = quickAddExpenseCategorySelect.value;

                if (amount && category) {
                    addExpense(amount, comment || 'Miscellaneous', category);
                    quickAddExpenseForm.reset();
                } else {
                    showNotification('Please enter amount and select a category.', true);
                }
            });
            // Categories Tab
            addCategoryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = categoryNameInput.value.trim();
                const goal = categoryGoalInput.value;
                if (name && goal) {
                    addCategory(name, goal);
                    addCategoryForm.reset();
                } else {
                    showNotification('Please fill in all category fields.', true);
                }
            });

            // Settings Tab
            resetMonthlyBtn.addEventListener('click', resetMonthlyData);

            // Statistics Tab
            exportToExcelBtn.addEventListener('click', () => {
                // Prepare data for Excel
                const data = [];
                data.push(['Type', 'Date', 'Amount', 'Description', 'Category/Source']);

                incomes.forEach(inc => {
                    data.push(['Income', new Date(inc.date).toLocaleString(), inc.amount.toFixed(2), inc.source, 'N/A']);
                });
                expenses.forEach(exp => {
                    data.push(['Expense', new Date(exp.date).toLocaleString(), exp.amount.toFixed(2), exp.comment, exp.category]);
                });

                const ws = XLSX.utils.aoa_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Financial Data");

                // Create a Blob and open in new tab
                const excelBlob = new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

                if (window.AndroidBridge && window.AndroidBridge.saveFile) {
                    blobToBase64(excelBlob).then(base64data => {
                        const fileName = `Spendlyst-Data-${new Date().toISOString().split('T')[0]}.xlsx`;
                        window.AndroidBridge.saveFile(base64data, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                    });
                } else {
                    const url = URL.createObjectURL(excelBlob);
                    window.open(url, '_blank');
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                    showNotification('Data opened in new tab for download!');
                }
            });
            exportChartPdfBtn.addEventListener('click', () => {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();

                // Re-get colors in case of dark mode
                const textColorPrimary = getCssVariable('--text-primary');
                const textColorSecondary = getCssVariable('--text-secondary');
                const accentPrimaryRGB = getCssVariable('--accent-primary-rgb').split(',').map(s => parseInt(s.trim()));
 
                doc.setFont('helvetica');
                doc.setFontSize(18);
                doc.text("Spendlyst Financial Statistics Report", 14, 22); // Changed app name
                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

                let yPos = 40;

                // NEW: Add Expenses by Category Bar Chart
                if (expensesByCategoryBarChart) {
                    doc.setFontSize(14);
                    doc.setTextColor(textColorPrimary);
                    doc.text("Expenses by Category (Bar Chart)", 14, yPos);
                    yPos += 5;
                    const barChartImg = expensesByCategoryBarChartCanvas.toDataURL('image/png', 1.0);
                    doc.addImage(barChartImg, 'PNG', 10, yPos, 180, 100);
                    yPos += 110;
                }

                // Add Expenses Details Table
                const expenseHeaders = [['Date', 'Category', 'Description', 'Amount (Rs.)']];
                const expenseData = expenses.map(expense => [
                    new Date(expense.date).toLocaleString(),
                    expense.category,
                    expense.comment,
                    `Rs. ${expense.amount.toFixed(2)}`
                ]);

                if (expenseData.length > 0) {
                    // Add a new page if current content is too long
                    if (yPos + 50 > doc.internal.pageSize.height) { // Estimate space needed for table title + a few rows
                        doc.addPage();
                        yPos = 20; // Reset yPos for new page
                    }

                    doc.setFontSize(14);
                    doc.setTextColor(textColorPrimary);
                    doc.text("All Expenses Details", 14, yPos);
                    yPos += 5;
                    doc.autoTable({
                        startY: yPos,
                        head: expenseHeaders,
                        body: expenseData,
                        theme: 'striped',
                        headStyles: { fillColor: accentPrimaryRGB },
                        styles: { font: 'helvetica', textColor: textColorPrimary },
                        margin: { top: 10, left: 14, right: 14 },
                        didDrawPage: function (data) {
                            yPos = data.cursor.y + 10; // Update yPos for next content
                        }
                    });
                } else {
                    // Add a new page if current content is too long
                    if (yPos + 20 > doc.internal.pageSize.height) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.setFontSize(12);
                    doc.setTextColor(textColorSecondary);
                    doc.text("No expense details available.", 14, yPos);
                }

                // Instead of doc.save(), open in new tab
                const pdfBlob = doc.output('blob');
                if (window.AndroidBridge && window.AndroidBridge.saveFile) {
                    blobToBase64(pdfBlob).then(base64data => {
                        const fileName = `Spendlyst-Statistics-${new Date().toISOString().split('T')[0]}.pdf`;
                        window.AndroidBridge.saveFile(base64data, fileName, 'application/pdf');
                    });
                } else {
                    const pdfUrl = URL.createObjectURL(pdfBlob);
                    window.open(pdfUrl, '_blank');
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                    showNotification('Statistics report opened in new tab for download!');
                }
            });
            // Reports Tab
            generateReportBtn.addEventListener('click', () => {
                generateReport(reportStartDateInput.value, reportEndDateInput.value);
            });
            exportReportPdfBtn.addEventListener('click', exportReportToPdf);
            // NEW: Financial Goal Planner Button
            getGoalPlanBtn.addEventListener('click', () => {
                goalInput.value = ''; // Clear previous input
                goalPlanOutput.innerHTML = `<div class="empty-state"><i data-feather="lightbulb"></i><p>Enter your goal above to get a personalized plan.</p></div>`;
                feather.replace();
                goalPlannerModal.classList.add('active');
            });
            // NEW: Generate Goal Plan button inside the modal
            generateGoalPlanBtn.addEventListener('click', async () => {
                const userGoal = goalInput.value.trim();
                if (!userGoal) {
                    showNotification('Please describe your financial goal.', true);
                    return;
                }

                goalPlanOutput.innerHTML = '<div class="empty-state" style="border:none;"><p>Generating your financial plan...</p></div>';
                feather.replace();

                if (!isOnline()) {
                    goalPlanOutput.innerHTML = '<div class="empty-state" style="border:none;"><p>Please connect to the internet to generate a financial plan.</p></div>';
                    feather.replace();
                    return;
                }

                try {
                    const prompt = `As a financial assistant, provide a concise, actionable financial plan for the following goal: "${userGoal}". The plan should include 3-5 distinct steps, each a single sentence. Conclude with a brief encouraging remark.`;
                    let chatHistory = [];
                    chatHistory.push({ role: "user", parts: [{ text: prompt }] });
                    const payload = { contents: chatHistory };
                    const apiKey = ""; // Canvas will provide this at runtime
                    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const result = await response.json();

                    if (result.candidates && result.candidates.length > 0 &&
                        result.candidates[0].content && result.candidates[0].content.parts &&
                        result.candidates[0].content.parts.length > 0) {
                        const text = result.candidates[0].content.parts[0].text;
                        const planSteps = text.split('\n').filter(step => step.trim() !== '');
                        goalPlanOutput.innerHTML = ''; // Clear loading state
                        planSteps.forEach(step => {
                            const li = document.createElement('li');
                            li.textContent = step.replace(/^- /, ''); // Remove markdown list prefix if present
                            goalPlanOutput.appendChild(li);
                        });
                    } else {
                        goalPlanOutput.innerHTML = '<div class="empty-state" style="border:none;"><p>Failed to generate plan. Please try again.</p></div>';
                    }
                } catch (error) {
                    console.error('Error fetching Gemini goal plan:', error);
                    goalPlanOutput.innerHTML = '<div class="empty-state" style="border:none;"><p>Error generating plan. Check your connection.</p></div>';
                }
                feather.replace();
            });
            notepadEditor.addEventListener('input', () => {
                const notepadSaveStatus = document.getElementById('notepad-save-status');
                if (notepadSaveStatus) {
                    notepadSaveStatus.textContent = 'Saving...';
                    notepadSaveStatus.style.opacity = '1';
                }
                // Debounce the save function
                clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(() => {
                    saveNotepadContent();
                }, 500); // Save after 500ms of inactivity
            });

            // Add a more robust save mechanism for when the app is backgrounded or closed
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    // Ensure any pending debounced save is cancelled and a final save is triggered immediately
                    clearTimeout(debounceTimeout);
                    saveNotepadContent();
                }
            });


        // NEW: Save selection on mousedown for color pickers to prevent losing it
        notepadTextColorPicker.parentElement.addEventListener('mousedown', saveNotepadSelection);
        notepadHighlightColorPicker.parentElement.addEventListener('mousedown', saveNotepadSelection);

        // Notepad Toolbar Event Listeners
        notepadBoldBtn.addEventListener('click', () => {
            document.execCommand('bold', false, null);
            notepadEditor.focus();
        });
        notepadUnderlineBtn.addEventListener('click', () => {
            document.execCommand('underline', false, null);
            notepadEditor.focus();
        });
        notepadItalicBtn.addEventListener('click', () => {
            document.execCommand('italic', false, null);
            notepadEditor.focus();
        });
        notepadIncreaseFontBtn.addEventListener('click', () => {
            // 'increaseFontSize' is deprecated. Using 'fontSize' with values 1-7 is more reliable.
            const currentSize = document.queryCommandValue('fontSize'); // Returns 1-7 as a string
            let newSize = parseInt(currentSize || '3') + 1;
            if (newSize > 7) newSize = 7;
            document.execCommand('fontSize', false, newSize);
            notepadEditor.focus();
        });
        notepadDecreaseFontBtn.addEventListener('click', () => {
            // 'decreaseFontSize' is deprecated.
            const currentSize = document.queryCommandValue('fontSize');
            let newSize = parseInt(currentSize || '3') - 1;
            if (newSize < 1) newSize = 1;
            document.execCommand('fontSize', false, newSize);
            notepadEditor.focus();
        });
        notepadClearFormatBtn.addEventListener('click', () => {
            showConfirmationModal(
                'Clear Notepad Content',
                'Are you sure you want to permanently delete all content from the notepad? This action cannot be undone.',
                () => {
                    notepadEditor.innerHTML = '';
                    saveNotepadContent();
                    showNotification('Notepad content has been cleared.');
                    notepadEditor.focus();
                }
            );
        });
        // FIX: Re-add missing text color listener and fix selection loss
        notepadTextColorPicker.addEventListener('input', (e) => {
            notepadEditor.focus();
            restoreNotepadSelection();
            document.execCommand('foreColor', false, e.target.value);
            savedNotepadSelection = null; // Clear selection after use
        });
        // FIX: Fix selection loss for highlight color
        notepadHighlightColorPicker.addEventListener('input', (e) => {
            notepadEditor.focus();
            restoreNotepadSelection();
            // 'hiliteColor' is non-standard, 'backColor' is more widely supported
            document.execCommand('backColor', false, e.target.value);
            savedNotepadSelection = null; // Clear selection after use
        });
        });
    
