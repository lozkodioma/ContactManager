/**
 * Лабораторна робота №1: «Основи JavaScript та динамічна взаємодія з DOM»
 * Дисципліна: «Технології веб-розробки», ХНУРЕ, Кафедра АПОТ
 * Варіант 10: Система управління контактами (ContactFlow)
 *
 * Файл: app.js — Головна логіка застосунку: обробка подій, валідація RegExp,
 * динамічний DOM-рендеринг, делегування подій, модальні вікна та бонуси (Toast, Теми, File API, Clipboard).
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // 1. ІНІЦІАЛІЗАЦІЯ ТА СТАН ЗАСТОСУНКУ
  // =========================================================================
  const manager = new ContactManager();

  // Поточні параметри відображення
  const state = {
    searchQuery: '',
    currentFilter: 'all', // 'all', 'favorites', 'family', 'work', 'friends', 'other'
    currentSort: 'date-desc', // 'name-asc', 'name-desc', 'date-desc', 'date-asc'
    viewMode: 'grouped', // 'grouped' або 'flat'
    contactToDeleteId: null,
    contactToEditId: null
  };

  // =========================================================================
  // 2. РЕГУЛЯРНІ ВИРАЗИ ТА ВАЛІДАЦІЯ (RegExp)
  // =========================================================================
  const REGEX = {
    // Ім'я: від 2 до 50 символів, українські та латинські літери, пробіли, апострофи, дефіси
    name: /^[A-Za-zА-Яа-яІіЇїЄєҐґ'’\s\-]{2,50}$/,

    // Телефон: український або міжнародний формат (+380XX..., 0XX..., +38 (0XX) XXX-XX-XX)
    phone: /^(\+?38\s?)?\(?0\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}$/,

    // Email: стандартна перевірка формату адреси електронної пошти
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

    // Категорія: тільки дозволені групи
    category: /^(family|work|friends|other)$/
  };

  const VALIDATION_MESSAGES = {
    name: "Ім'я повинно містити від 2 до 50 літер (підтримуються українські та латинські символи, дефіс, апостроф).",
    phone: "Введіть номер у форматі +38 (0XX) XXX-XX-XX або 0XXXXXXXXX (10-12 цифр).",
    email: "Введіть коректну адресу електронної пошти (наприклад: name@example.com).",
    category: "Будь ласка, оберіть категорію контакту зі списку."
  };

  /**
   * Валідація окремого поля форми за регулярним виразом
   * @param {HTMLInputElement|HTMLSelectElement} inputEl 
   * @param {string} fieldType 
   * @returns {boolean}
   */
  function validateField(inputEl, fieldType) {
    if (!inputEl) return true;
    const value = inputEl.value.trim();
    const groupEl = inputEl.closest('.form-group');
    const errorEl = groupEl ? groupEl.querySelector('.field-error') : null;
    const regex = REGEX[fieldType];

    if (!regex) return true;

    const isValid = regex.test(value);

    if (groupEl) {
      if (!isValid) {
        groupEl.classList.add('is-invalid');
        groupEl.classList.remove('is-valid');
        if (errorEl) {
          errorEl.textContent = VALIDATION_MESSAGES[fieldType] || 'Некоректне значення поля.';
        }
      } else {
        groupEl.classList.remove('is-invalid');
        groupEl.classList.add('is-valid');
        if (errorEl) {
          errorEl.textContent = '';
        }
      }
    }

    return isValid;
  }

  /**
   * Очищення стану валідації форми
   * @param {HTMLFormElement} form 
   */
  function clearFormValidation(form) {
    const groups = form.querySelectorAll('.form-group');
    groups.forEach(g => {
      g.classList.remove('is-invalid', 'is-valid');
      const err = g.querySelector('.field-error');
      if (err) err.textContent = '';
    });
  }

  /**
   * Автоматичне маскування та форматування номера телефону під час набору (Бонус: Варіант 7)
   * Перетворює послідовність цифр на формат +38 (0XX) XXX-XX-XX
   * @param {HTMLInputElement} inputEl 
   */
  function formatPhoneInput(inputEl) {
    let raw = inputEl.value.replace(/\D/g, ''); // видаляємо всі нецифрові знаки

    // Якщо починається з 380, прибираємо перші цифри для уніфікації
    if (raw.startsWith('380')) {
      raw = raw.substring(2); // залишаємо '0...'
    }

    // Обмежуємо 10 цифрами (0XXXXXXXXX)
    if (raw.length > 10) {
      raw = raw.substring(0, 10);
    }

    let formatted = '';
    if (raw.length > 0) {
      formatted = '+38 (';
      if (raw.length <= 3) {
        formatted += raw;
      } else if (raw.length <= 6) {
        formatted += raw.substring(0, 3) + ') ' + raw.substring(3);
      } else if (raw.length <= 8) {
        formatted += raw.substring(0, 3) + ') ' + raw.substring(3, 6) + '-' + raw.substring(6);
      } else {
        formatted += raw.substring(0, 3) + ') ' + raw.substring(3, 6) + '-' + raw.substring(6, 8) + '-' + raw.substring(8, 10);
      }
    }

    inputEl.value = formatted;
  }

  // =========================================================================
  // 3. ДОПОМІЖНІ UI-ФУНКЦІЇ: TOAST СПОВІЩЕННЯ ТА ТЕМИ
  // =========================================================================
  /**
   * Показ спливаючого повідомлення Toast (Бонус: Варіант 4)
   * @param {string} title 
   * @param {string} message 
   * @param {'success'|'danger'|'info'|'warning'} type 
   * @param {number} duration 
   */
  function showToast(title, message, type = 'success', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: '✅',
      danger: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <div class="toast-body">
        <div class="toast-title">${escapeHTML(title)}</div>
        <div class="toast-message">${escapeHTML(message)}</div>
      </div>
      <button type="button" class="toast-close" aria-label="Закрити">&times;</button>
    `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    const dismiss = () => {
      toast.classList.add('toast-hiding');
      setTimeout(() => toast.remove(), 200);
    };

    closeBtn.addEventListener('click', dismiss);
    const timer = setTimeout(dismiss, duration);

    toast.addEventListener('mouseenter', () => clearTimeout(timer));
  }

  /**
   * Безпечне екранування тексту для запобігання XSS
   * @param {string} str 
   * @returns {string}
   */
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Підсвічування знайденого фрагмента в тексті через RegExp (Крок 9)
   * @param {string} text 
   * @param {string} query 
   * @returns {string}
   */
  function highlightMatch(text, query) {
    if (!text) return '';
    if (!query || !query.trim()) return escapeHTML(text);

    try {
      const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      const escapedText = escapeHTML(text);
      return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
    } catch {
      return escapeHTML(text);
    }
  }

  /**
   * Копіювання тексту в буфер обміну (Бонус: Варіант 9 - Clipboard API)
   * @param {string} text 
   * @param {string} label 
   */
  async function copyToClipboard(text, label) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Запасний варіант для старих браузерів
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      showToast('Скопійовано!', `${label}: ${text}`, 'info', 2500);
    } catch (err) {
      showToast('Помилка', 'Не вдалося скопіювати дані в буфер обміну.', 'danger');
    }
  }

  // =========================================================================
  // 4. ДИНАМІЧНИЙ DOM-РЕНДЕРИНГ КОНТАКТІВ (Крок 7, Завдання Варіант 10)
  // =========================================================================
  const contactsContainer = document.getElementById('contacts-container');
  const emptyState = document.getElementById('empty-state');
  const resultsCountText = document.getElementById('results-count-text');
  const resetAllFiltersBtn = document.getElementById('reset-all-filters-btn');

  /**
   * Головна функція рендерингу інтерфейсу
   */
  function render() {
    // 1. Оновлення лічильників у навігації та статистиці
    updateCountersAndStats();

    // 2. Отримання відфільтрованого та відсортованого списку
    let list = manager.contacts;

    // Фільтрація за категорією або обраним
    if (state.currentFilter === 'favorites') {
      list = manager.filter({ isFavoriteOnly: true, sourceList: list });
    } else if (state.currentFilter !== 'all') {
      list = manager.filter({ group: state.currentFilter, sourceList: list });
    }

    // Пошук за регулярним виразом
    if (state.searchQuery.trim()) {
      list = manager.search(state.searchQuery, list);
    }

    // Сортування
    list = manager.sort(list, state.currentSort);

    // 3. Відображення лічильника результатів
    resultsCountText.textContent = `Показано контактів: ${list.length} з ${manager.contacts.length}`;
    if (state.searchQuery.trim() || state.currentFilter !== 'all') {
      resetAllFiltersBtn.classList.remove('hidden');
    } else {
      resetAllFiltersBtn.classList.add('hidden');
    }

    // 4. Перевірка на порожній список
    contactsContainer.innerHTML = '';
    if (list.length === 0) {
      contactsContainer.classList.add('hidden');
      emptyState.classList.remove('hidden');

      const emptyDesc = document.getElementById('empty-state-text');
      if (state.searchQuery.trim()) {
        emptyDesc.textContent = `За запитом «${state.searchQuery}» нічого не знайдено. Спробуйте інше ім'я або номер.`;
      } else if (state.currentFilter === 'favorites') {
        emptyDesc.textContent = 'У вас поки що немає обраних контактів. Натисніть ⭐ на картці контакту, щоб додати його сюди.';
      } else if (state.currentFilter !== 'all') {
        emptyDesc.textContent = 'У цій категорії ще немає контактів. Додайте перший контакт через форму ліворуч.';
      } else {
        emptyDesc.textContent = 'Ваша телефонна книга порожня. Створіть перший контакт за допомогою форми!';
      }
      return;
    }

    contactsContainer.classList.remove('hidden');
    emptyState.classList.add('hidden');

    // 5. Рендеринг: групований вигляд (Варіант 10) або плоский список
    if (state.viewMode === 'grouped' && state.currentFilter === 'all' && !state.searchQuery.trim()) {
      renderGroupedView(list);
    } else {
      renderFlatView(list);
    }
  }

  /**
   * Створення DOM-елемента однієї картки контакту
   * @param {Contact} contact 
   * @returns {HTMLElement} <article class="contact-card">
   */
  function createContactCardElement(contact) {
    const card = document.createElement('article');
    card.className = `contact-card card ${contact.isFavorite ? 'is-favorite' : ''}`;
    card.dataset.id = contact.id;

    // Форматування дати створення (наприклад: 28.10.2026)
    const dateFormatted = new Date(contact.createdAt).toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const initials = contact.getInitials();
    const highlightedName = highlightMatch(contact.name, state.searchQuery);
    const highlightedPhone = highlightMatch(contact.phone, state.searchQuery);
    const highlightedEmail = highlightMatch(contact.email, state.searchQuery);

    const groupMeta = {
      family: { label: 'Родина', icon: '👨‍👩‍👧‍👦', badgeClass: 'badge-family', avatarClass: 'avatar-family' },
      work: { label: 'Робота', icon: '💼', badgeClass: 'badge-work', avatarClass: 'avatar-work' },
      friends: { label: 'Друзі', icon: '🎉', badgeClass: 'badge-friends', avatarClass: 'avatar-friends' },
      other: { label: 'Інше', icon: '📁', badgeClass: 'badge-other', avatarClass: 'avatar-other' }
    }[contact.group] || { label: 'Інше', icon: '📁', badgeClass: 'badge-other', avatarClass: 'avatar-other' };

    card.innerHTML = `
      <div class="card-header-row">
        <div class="contact-avatar ${groupMeta.avatarClass}" aria-hidden="true">${initials}</div>
        <div class="contact-meta">
          <h4 class="contact-name" title="${escapeHTML(contact.name)}">${highlightedName}</h4>
          <span class="category-badge ${groupMeta.badgeClass}">
            <span aria-hidden="true">${groupMeta.icon}</span>
            <span>${groupMeta.label}</span>
          </span>
        </div>
        <button 
          type="button" 
          class="btn-star toggle-favorite-btn ${contact.isFavorite ? 'active' : ''}" 
          title="${contact.isFavorite ? 'Видалити з обраних' : 'Додати в обрані'}"
          aria-label="${contact.isFavorite ? 'Видалити з обраних' : 'Додати в обрані'}"
        >
          ★
        </button>
      </div>

      <div class="card-details-list">
        <!-- Телефон -->
        <div class="detail-row">
          <div class="detail-link-wrap">
            <span aria-hidden="true">📞</span>
            <a href="tel:${escapeHTML(contact.phone.replace(/\s+/g, ''))}" class="detail-link" title="Зателефонувати">
              ${highlightedPhone}
            </a>
          </div>
          <button 
            type="button" 
            class="copy-btn copy-phone-btn" 
            data-copy="${escapeHTML(contact.phone)}" 
            title="Скопіювати телефон"
            aria-label="Скопіювати телефон"
          >
            📋
          </button>
        </div>

        <!-- Email -->
        <div class="detail-row">
          <div class="detail-link-wrap">
            <span aria-hidden="true">✉️</span>
            <a href="mailto:${escapeHTML(contact.email)}" class="detail-link" title="Написати листа">
              ${highlightedEmail}
            </a>
          </div>
          <button 
            type="button" 
            class="copy-btn copy-email-btn" 
            data-copy="${escapeHTML(contact.email)}" 
            title="Скопіювати Email"
            aria-label="Скопіювати Email"
          >
            📋
          </button>
        </div>

        <!-- Нотатки (якщо є) -->
        ${contact.notes ? `
          <div class="contact-notes-box" title="Нотатки">
            📝 ${highlightMatch(contact.notes, state.searchQuery)}
          </div>
        ` : ''}
      </div>

      <div class="card-footer-row">
        <span class="card-created-date">Створено: ${dateFormatted}</span>
        <div class="card-action-btns">
          <button type="button" class="action-icon-btn edit-btn" title="Редагувати контакт" aria-label="Редагувати контакт">
            ✏️
          </button>
          <button type="button" class="action-icon-btn delete-btn" title="Видалити контакт" aria-label="Видалити контакт">
            🗑️
          </button>
        </div>
      </div>
    `;

    return card;
  }

  /**
   * Рендеринг контактів, згрупованих за категоріями (Варіант 10)
   * @param {Array<Contact>} list 
   */
  function renderGroupedView(list) {
    const groups = manager.groupByCategory(list);
    const order = ['family', 'work', 'friends', 'other'];

    order.forEach(groupKey => {
      const grp = groups[groupKey];
      if (!grp || grp.items.length === 0) return;

      const section = document.createElement('section');
      section.className = 'category-group-section';

      section.innerHTML = `
        <div class="category-group-header">
          <span class="group-header-icon" aria-hidden="true">${grp.icon}</span>
          <h3 class="group-header-title">${grp.label}</h3>
          <span class="group-header-count">${grp.items.length}</span>
        </div>
      `;

      const grid = document.createElement('div');
      grid.className = 'contacts-grid';

      grp.items.forEach(contact => {
        grid.appendChild(createContactCardElement(contact));
      });

      section.appendChild(grid);
      contactsContainer.appendChild(section);
    });
  }

  /**
   * Рендеринг контактів єдиною суцільною сіткою (при активному пошуку або плоскому виді)
   * @param {Array<Contact>} list 
   */
  function renderFlatView(list) {
    const grid = document.createElement('div');
    grid.className = 'contacts-grid';

    list.forEach(contact => {
      grid.appendChild(createContactCardElement(contact));
    });

    contactsContainer.appendChild(grid);
  }

  /**
   * Оновлення бейджів навігації та віджета статистики
   */
  function updateCountersAndStats() {
    const stats = manager.getStats();

    // Оновлення значень у табах категорій
    const setBadge = (id, count) => {
      const el = document.getElementById(id);
      if (el) el.textContent = count;
    };

    setBadge('badge-all', stats.total);
    setBadge('badge-favorites', stats.favorites);
    setBadge('badge-family', stats.byGroup.family);
    setBadge('badge-work', stats.byGroup.work);
    setBadge('badge-friends', stats.byGroup.friends);
    setBadge('badge-other', stats.byGroup.other);

    // Оновлення віджета статистики
    const setStat = (id, count) => {
      const el = document.getElementById(id);
      if (el) el.textContent = count;
    };

    setStat('stat-total', stats.total);
    setStat('stat-favorites', stats.favorites);
    setStat('stat-family', stats.byGroup.family);
    setStat('stat-work', stats.byGroup.work);
    setStat('stat-friends', stats.byGroup.friends);
    setStat('stat-other', stats.byGroup.other);
  }

  // =========================================================================
  // 5. ДЕЛЕГУВАННЯ ПОДІЙ ДЛЯ ДИНАМІЧНОГО СПИСКУ (Крок 8, Завдання Варіант 10)
  // Подія 'click' приєднується до спільного контейнера #contacts-container
  // =========================================================================
  contactsContainer.addEventListener('click', (event) => {
    // 1. Кнопка видалення (видалення з підтвердженням дії в модальному вікні)
    const deleteBtn = event.target.closest('.delete-btn');
    if (deleteBtn) {
      const card = deleteBtn.closest('.contact-card');
      if (card && card.dataset.id) {
        openDeleteModal(card.dataset.id);
      }
      return;
    }

    // 2. Кнопка редагування (відкриття модального вікна редагування)
    const editBtn = event.target.closest('.edit-btn');
    if (editBtn) {
      const card = editBtn.closest('.contact-card');
      if (card && card.dataset.id) {
        openEditModal(card.dataset.id);
      }
      return;
    }

    // 3. Перемикач "Обрані" (зірочка)
    const starBtn = event.target.closest('.toggle-favorite-btn');
    if (starBtn) {
      const card = starBtn.closest('.contact-card');
      if (card && card.dataset.id) {
        const isFav = manager.toggleFavorite(card.dataset.id);
        const contact = manager.getById(card.dataset.id);
        showToast(
          isFav ? 'Додано в обрані ⭐' : 'Видалено з обраних',
          `${contact ? contact.name : 'Контакт'} ${isFav ? 'тепер серед обраних.' : 'прибрано з обраних.'}`,
          'info',
          2000
        );
        render();
      }
      return;
    }

    // 4. Кнопка копіювання в буфер обміну (Clipboard API)
    const copyBtn = event.target.closest('.copy-btn');
    if (copyBtn) {
      const textToCopy = copyBtn.dataset.copy;
      const isPhone = copyBtn.classList.contains('copy-phone-btn');
      if (textToCopy) {
        copyToClipboard(textToCopy, isPhone ? 'Номер телефону' : 'Email');
      }
      return;
    }
  });

  // =========================================================================
  // 6. ОБРОБКА ФОРМИ ДОДАВАННЯ КОНТАКТУ (Крок 5, подія submit)
  // =========================================================================
  const addForm = document.getElementById('add-contact-form');
  const addNameInput = document.getElementById('add-name');
  const addPhoneInput = document.getElementById('add-phone');
  const addEmailInput = document.getElementById('add-email');
  const addCategorySelect = document.getElementById('add-category');
  const addNotesInput = document.getElementById('add-notes');
  const addFavoriteCheckbox = document.getElementById('add-favorite');
  const addCharCount = document.getElementById('add-char-count');

  // Лічильник символів для нотаток (подія input)
  if (addNotesInput && addCharCount) {
    addNotesInput.addEventListener('input', () => {
      addCharCount.textContent = addNotesInput.value.length;
    });
  }

  // Жива перевірка (подія input / change) та автоформатування телефону
  addNameInput.addEventListener('input', () => validateField(addNameInput, 'name'));
  addPhoneInput.addEventListener('input', () => {
    formatPhoneInput(addPhoneInput);
    validateField(addPhoneInput, 'phone');
  });
  addEmailInput.addEventListener('input', () => validateField(addEmailInput, 'email'));
  addCategorySelect.addEventListener('change', () => validateField(addCategorySelect, 'category'));

  // Надсилання форми додавання
  addForm.addEventListener('submit', (event) => {
    event.preventDefault(); // Запобігаємо перезавантаженню сторінки

    // Валідація всіх полів регулярними виразами
    const isNameValid = validateField(addNameInput, 'name');
    const isPhoneValid = validateField(addPhoneInput, 'phone');
    const isEmailValid = validateField(addEmailInput, 'email');
    const isCategoryValid = validateField(addCategorySelect, 'category');

    if (!isNameValid || !isPhoneValid || !isEmailValid || !isCategoryValid) {
      showToast('Помилка валідації', 'Будь ласка, перевірте коректність заповнення виділених полів.', 'danger');
      return;
    }

    // Перевірка на дублювання номера або email
    const duplicatePhone = manager.contacts.some(c => c.phone === addPhoneInput.value.trim());
    if (duplicatePhone) {
      showToast('Увага!', `Контакт із номером ${addPhoneInput.value.trim()} вже існує в списку!`, 'warning');
    }

    // Створення нового об'єкта та збереження в менеджер і localStorage
    const newContact = manager.add({
      name: addNameInput.value,
      phone: addPhoneInput.value,
      email: addEmailInput.value,
      group: addCategorySelect.value,
      notes: addNotesInput.value,
      isFavorite: addFavoriteCheckbox.checked
    });

    // Очищення форми
    addForm.reset();
    clearFormValidation(addForm);
    if (addCharCount) addCharCount.textContent = '0';

    showToast('Успішно збережено!', `Контакт «${newContact.name}» успішно додано.`, 'success');
    render();
  });

  addForm.addEventListener('reset', () => {
    clearFormValidation(addForm);
    if (addCharCount) addCharCount.textContent = '0';
  });

  // =========================================================================
  // 7. МОДАЛЬНЕ ВІКНО РЕДАГУВАННЯ КОНТАКТУ (Варіант 10)
  // =========================================================================
  const editModal = document.getElementById('edit-modal');
  const editForm = document.getElementById('edit-contact-form');
  const editIdInput = document.getElementById('edit-id');
  const editNameInput = document.getElementById('edit-name');
  const editPhoneInput = document.getElementById('edit-phone');
  const editEmailInput = document.getElementById('edit-email');
  const editCategorySelect = document.getElementById('edit-category');
  const editNotesInput = document.getElementById('edit-notes');
  const editFavoriteCheckbox = document.getElementById('edit-favorite');
  const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');

  function openEditModal(id) {
    const contact = manager.getById(id);
    if (!contact) return;

    state.contactToEditId = id;
    editIdInput.value = contact.id;
    editNameInput.value = contact.name;
    editPhoneInput.value = contact.phone;
    editEmailInput.value = contact.email;
    editCategorySelect.value = contact.group;
    editNotesInput.value = contact.notes;
    editFavoriteCheckbox.checked = contact.isFavorite;

    clearFormValidation(editForm);
    editModal.classList.remove('hidden');
    editNameInput.focus();
  }

  function closeEditModal() {
    editModal.classList.add('hidden');
    state.contactToEditId = null;
    clearFormValidation(editForm);
  }

  // Жива валідація у формі редагування
  editNameInput.addEventListener('input', () => validateField(editNameInput, 'name'));
  editPhoneInput.addEventListener('input', () => {
    formatPhoneInput(editPhoneInput);
    validateField(editPhoneInput, 'phone');
  });
  editEmailInput.addEventListener('input', () => validateField(editEmailInput, 'email'));
  editCategorySelect.addEventListener('change', () => validateField(editCategorySelect, 'category'));

  // Збереження змін редагування
  editForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const isNameValid = validateField(editNameInput, 'name');
    const isPhoneValid = validateField(editPhoneInput, 'phone');
    const isEmailValid = validateField(editEmailInput, 'email');
    const isCategoryValid = validateField(editCategorySelect, 'category');

    if (!isNameValid || !isPhoneValid || !isEmailValid || !isCategoryValid) {
      showToast('Помилка', 'Перевірте правильність заповнення полів.', 'danger');
      return;
    }

    const updated = manager.update(state.contactToEditId, {
      name: editNameInput.value,
      phone: editPhoneInput.value,
      email: editEmailInput.value,
      group: editCategorySelect.value,
      notes: editNotesInput.value,
      isFavorite: editFavoriteCheckbox.checked
    });

    if (updated) {
      showToast('Зміни збережено!', `Контакт «${updated.name}» успішно оновлено.`, 'success');
      closeEditModal();
      render();
    }
  });

  closeEditModalBtn.addEventListener('click', closeEditModal);
  cancelEditBtn.addEventListener('click', closeEditModal);

  // =========================================================================
  // 8. МОДАЛЬНЕ ВІКНО ПІДТВЕРДЖЕННЯ ВИДАЛЕННЯ (Варіант 10)
  // =========================================================================
  const deleteModal = document.getElementById('delete-modal');
  const deleteNameDisplay = document.getElementById('delete-contact-name-display');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

  function openDeleteModal(id) {
    const contact = manager.getById(id);
    if (!contact) return;

    state.contactToDeleteId = id;
    deleteNameDisplay.textContent = `«${contact.name}»`;
    deleteModal.classList.remove('hidden');
    confirmDeleteBtn.focus();
  }

  function closeDeleteModal() {
    deleteModal.classList.add('hidden');
    state.contactToDeleteId = null;
  }

  confirmDeleteBtn.addEventListener('click', () => {
    if (!state.contactToDeleteId) return;
    const removed = manager.remove(state.contactToDeleteId);
    if (removed) {
      showToast('Видалено!', `Контакт «${removed.name}» було успішно видалено.`, 'warning');
      closeDeleteModal();
      render();
    }
  });

  cancelDeleteBtn.addEventListener('click', closeDeleteModal);

  // Закриття модалок при кліку поза вікном (на напівпрозорий фон)
  [editModal, deleteModal].forEach(modalEl => {
    modalEl.addEventListener('click', (event) => {
      if (event.target === modalEl) {
        if (modalEl === editModal) closeEditModal();
        if (modalEl === deleteModal) closeDeleteModal();
      }
    });
  });

  // Закриття модалок клавішею Escape (подія keydown)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!editModal.classList.contains('hidden')) closeEditModal();
      if (!deleteModal.classList.contains('hidden')) closeDeleteModal();
    }
  });

  // =========================================================================
  // 9. ПОШУК ТА ФІЛЬТРАЦІЯ У РЕАЛЬНОМУ ЧАСІ (Крок 9, подія input та change)
  // =========================================================================
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const sortSelect = document.getElementById('sort-select');
  const toggleViewGrouped = document.getElementById('toggle-view-grouped');
  const toggleViewFlat = document.getElementById('toggle-view-flat');
  const navTabs = document.querySelectorAll('.nav-tab');

  // Пошук у реальному часі (подія input)
  searchInput.addEventListener('input', (event) => {
    state.searchQuery = event.target.value;
    if (state.searchQuery.length > 0) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }
    render();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    searchInput.focus();
    render();
  });

  // Сортування контактів (подія change)
  sortSelect.addEventListener('change', (event) => {
    state.currentSort = event.target.value;
    render();
  });

  // Перемикання вкладок категорій (подія click)
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentFilter = tab.dataset.filter;
      render();
    });
  });

  // Перемикання режиму: Групований / Плоский список
  toggleViewGrouped.addEventListener('click', () => {
    state.viewMode = 'grouped';
    toggleViewGrouped.classList.add('active');
    toggleViewGrouped.setAttribute('aria-pressed', 'true');
    toggleViewFlat.classList.remove('active');
    toggleViewFlat.setAttribute('aria-pressed', 'false');
    render();
  });

  toggleViewFlat.addEventListener('click', () => {
    state.viewMode = 'flat';
    toggleViewFlat.classList.add('active');
    toggleViewFlat.setAttribute('aria-pressed', 'true');
    toggleViewGrouped.classList.remove('active');
    toggleViewGrouped.setAttribute('aria-pressed', 'false');
    render();
  });

  // Скидання всіх фільтрів (подія click)
  resetAllFiltersBtn.addEventListener('click', resetFilters);
  document.getElementById('empty-action-btn').addEventListener('click', resetFilters);

  function resetFilters() {
    searchInput.value = '';
    state.searchQuery = '';
    clearSearchBtn.classList.add('hidden');

    navTabs.forEach(t => t.classList.remove('active'));
    const allTab = document.getElementById('tab-all');
    if (allTab) allTab.classList.add('active');
    state.currentFilter = 'all';

    render();
  }

  // =========================================================================
  // 10. БОНУСИ: ТЕМИ ОФОРМЛЕННЯ (Light / Dark) ТА JSON FILE API
  // =========================================================================
  // Перемикач теми
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const savedTheme = localStorage.getItem('contact_app_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('contact_app_theme', newTheme);
    showToast('Тему змінено', `Активовано ${newTheme === 'dark' ? 'темну' : 'світлу'} тему оформлення.`, 'info', 2000);
  });

  // Експорт у JSON (File API: Blob)
  const exportBtn = document.getElementById('export-json-btn');
  exportBtn.addEventListener('click', () => {
    const dataStr = manager.exportJSON();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `contacts_backup_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Експорт успішний', `Файл contacts_backup_${dateStr}.json збережено.`, 'success');
  });

  // Імпорт з JSON (File API: FileReader)
  const importBtn = document.getElementById('import-json-btn');
  const importFileInput = document.getElementById('import-file-input');

  importBtn.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const result = manager.importJSON(content);
      if (result.success) {
        showToast('Імпорт успішний', `Додано ${result.count} нових контактів із файлу.`, 'success');
        render();
      } else {
        showToast('Помилка імпорту', result.error, 'danger');
      }
      importFileInput.value = ''; // скидання вибору файлу
    };
    reader.onerror = () => {
      showToast('Помилка читання', 'Не вдалося прочитати обраний файл.', 'danger');
      importFileInput.value = '';
    };
    reader.readAsText(file);
  });

  // =========================================================================
  // 11. ПЕРВИННИЙ ЗАПУСК ТА ВІДОБРАЖЕННЯ
  // =========================================================================
  render();
});
