/**
 * Лабораторна робота №1: «Основи JavaScript та динамічна взаємодія з DOM»
 * Дисципліна: «Технології веб-розробки», ХНУРЕ, Кафедра АПОТ
 * Варіант 10: Система управління контактами
 *
 * Файл: models.js — ES6+ класи сутності Contact та менеджера контактів ContactManager
 */

/**
 * Клас Contact — представляє окремий контакт у системі
 */
class Contact {
  /**
   * @param {Object} param0 
   * @param {string} [param0.id] - Унікальний ідентифікатор
   * @param {string} param0.name - ПІБ / Ім'я контакту
   * @param {string} param0.phone - Номер телефону
   * @param {string} param0.email - Електронна пошта
   * @param {string} [param0.group] - Категорія (family, work, friends, other)
   * @param {string} [param0.notes] - Додаткові нотатки
   * @param {boolean} [param0.isFavorite] - Прапорець обраного контакту
   * @param {string} [param0.createdAt] - Дата та час додавання контакту (ISO рядок)
   */
  constructor({
    id = null,
    name = '',
    phone = '',
    email = '',
    group = 'family',
    notes = '',
    isFavorite = false,
    createdAt = null
  } = {}) {
    this.id = id || (typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9));
    this.name = name.trim();
    this.phone = phone.trim();
    this.email = email.trim().toLowerCase();
    this.group = ['family', 'work', 'friends', 'other'].includes(group) ? group : 'other';
    this.notes = notes.trim();
    this.isFavorite = Boolean(isFavorite);
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = this.createdAt;
  }

  /**
   * Оновлення полів контакту
   * @param {Object} updatedData 
   */
  update(updatedData = {}) {
    if (updatedData.name !== undefined) this.name = updatedData.name.trim();
    if (updatedData.phone !== undefined) this.phone = updatedData.phone.trim();
    if (updatedData.email !== undefined) this.email = updatedData.email.trim().toLowerCase();
    if (updatedData.group !== undefined && ['family', 'work', 'friends', 'other'].includes(updatedData.group)) {
      this.group = updatedData.group;
    }
    if (updatedData.notes !== undefined) this.notes = updatedData.notes.trim();
    if (updatedData.isFavorite !== undefined) this.isFavorite = Boolean(updatedData.isFavorite);
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Перемикання статусу обраного контакту
   * @returns {boolean} Новий стан isFavorite
   */
  toggleFavorite() {
    this.isFavorite = !this.isFavorite;
    this.updatedAt = new Date().toISOString();
    return this.isFavorite;
  }

  /**
   * Отримання ініціалів для аватара
   * @returns {string} 1-2 великі літери
   */
  getInitials() {
    const parts = this.name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Назва категорії українською мовою
   * @returns {string}
   */
  getGroupLabel() {
    const labels = {
      family: 'Родина',
      work: 'Робота',
      friends: 'Друзі',
      other: 'Інше'
    };
    return labels[this.group] || 'Інше';
  }

  /**
   * Серіалізація в об'єкт для збереження
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      phone: this.phone,
      email: this.email,
      group: this.group,
      notes: this.notes,
      isFavorite: this.isFavorite,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

/**
 * Клас ContactManager — інкапсулює масив об'єктів Contact та операції над ним:
 * додавання, редагування, видалення, пошук, фільтрацію, сортування, групування,
 * синхронізацію з localStorage та експорт/імпорт у JSON.
 */
class ContactManager {
  /**
   * @param {string} storageKey - Ключ у localStorage
   */
  constructor(storageKey = 'contact_manager_v10_items') {
    this.storageKey = storageKey;
    this.contacts = [];
    this.loadFromStorage();
  }

  /**
   * Додавання нового контакту
   * @param {Object|Contact} contactData 
   * @returns {Contact}
   */
  add(contactData) {
    const contact = contactData instanceof Contact ? contactData : new Contact(contactData);
    this.contacts.unshift(contact);
    this.saveToStorage();
    return contact;
  }

  /**
   * Редагування існуючого контакту за id
   * @param {string} id 
   * @param {Object} updatedData 
   * @returns {Contact|null}
   */
  update(id, updatedData) {
    const contact = this.getById(id);
    if (!contact) return null;
    contact.update(updatedData);
    this.saveToStorage();
    return contact;
  }

  /**
   * Видалення контакту за id
   * @param {string} id 
   * @returns {Contact|null} Видалений контакт або null
   */
  remove(id) {
    const index = this.contacts.findIndex(c => c.id === id);
    if (index === -1) return null;
    const removed = this.contacts.splice(index, 1)[0];
    this.saveToStorage();
    return removed;
  }

  /**
   * Отримання контакту за унікальним id
   * @param {string} id 
   * @returns {Contact|null}
   */
  getById(id) {
    return this.contacts.find(c => c.id === id) || null;
  }

  /**
   * Перемикання прапорця обраного
   * @param {string} id 
   * @returns {boolean|null}
   */
  toggleFavorite(id) {
    const contact = this.getById(id);
    if (!contact) return null;
    const res = contact.toggleFavorite();
    this.saveToStorage();
    return res;
  }

  /**
   * Пошук контактів за ім'ям, телефоном, email або нотатками у реальному часі за допомогою RegExp
   * @param {string} query 
   * @param {Array<Contact>} [targetList] 
   * @returns {Array<Contact>}
   */
  search(query, targetList = this.contacts) {
    if (!query || !query.trim()) return [...targetList];
    const trimmed = query.trim();
    // Екранування спеціальних символів регулярного виразу
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    return targetList.filter(contact => {
      // Пошук за ім'ям, телефоном (з урахуванням і без пробілів/дужок), email та нотатками
      const cleanPhone = contact.phone.replace(/[\s\-()]/g, '');
      const cleanQuery = trimmed.replace(/[\s\-()]/g, '');

      return (
        regex.test(contact.name) ||
        regex.test(contact.phone) ||
        (cleanQuery && cleanPhone.includes(cleanQuery)) ||
        regex.test(contact.email) ||
        regex.test(contact.notes)
      );
    });
  }

  /**
   * Фільтрація списку контактів за категорією та/або статусом обраного
   * @param {Object} options
   * @param {string} [options.group] - 'all' | 'family' | 'work' | 'friends' | 'other'
   * @param {boolean} [options.isFavoriteOnly]
   * @param {Array<Contact>} [options.sourceList]
   * @returns {Array<Contact>}
   */
  filter({ group = 'all', isFavoriteOnly = false, sourceList = this.contacts } = {}) {
    return sourceList.filter(contact => {
      const matchGroup = group === 'all' || contact.group === group;
      const matchFavorite = !isFavoriteOnly || contact.isFavorite;
      return matchGroup && matchFavorite;
    });
  }

  /**
   * Сортування списку контактів
   * @param {Array<Contact>} list 
   * @param {string} sortKey - 'name-asc' | 'name-desc' | 'date-desc' | 'date-asc'
   * @returns {Array<Contact>}
   */
  sort(list, sortKey = 'name-asc') {
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case 'name-asc':
          return a.name.localeCompare(b.name, 'uk', { sensitivity: 'base' });
        case 'name-desc':
          return b.name.localeCompare(a.name, 'uk', { sensitivity: 'base' });
        case 'date-desc':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'date-asc':
          return new Date(a.createdAt) - new Date(b.createdAt);
        default:
          return 0;
      }
    });
    return sorted;
  }

  /**
   * Групування контактів за категоріями (родина, робота, друзі, інше)
   * Відповідно до індивідуального завдання Варіанту 10
   * @param {Array<Contact>} [contactsList]
   * @returns {Object}
   */
  groupByCategory(contactsList = this.contacts) {
    const groups = {
      family: { key: 'family', label: 'Родина', icon: '👨‍👩‍👧‍👦', items: [] },
      work: { key: 'work', label: 'Робота', icon: '💼', items: [] },
      friends: { key: 'friends', label: 'Друзі', icon: '🎉', items: [] },
      other: { key: 'other', label: 'Інше', icon: '📁', items: [] }
    };

    contactsList.forEach(contact => {
      const groupKey = groups[contact.group] ? contact.group : 'other';
      groups[groupKey].items.push(contact);
    });

    return groups;
  }

  /**
   * Отримання статистики для віджетів та фільтрів
   * @returns {Object}
   */
  getStats() {
    const total = this.contacts.length;
    const favorites = this.contacts.filter(c => c.isFavorite).length;
    const byGroup = {
      family: this.contacts.filter(c => c.group === 'family').length,
      work: this.contacts.filter(c => c.group === 'work').length,
      friends: this.contacts.filter(c => c.group === 'friends').length,
      other: this.contacts.filter(c => c.group === 'other').length
    };
    return { total, favorites, byGroup };
  }

  /**
   * Збереження колекції в localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.contacts.map(c => c.toJSON())));
    } catch (error) {
      console.error('Помилка запису в localStorage:', error);
    }
  }

  /**
   * Відновлення колекції з localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.contacts = parsed.map(item => new Contact(item));
          return;
        }
      }
    } catch (error) {
      console.error('Помилка зчитування з localStorage:', error);
    }
    // Початкові демонстраційні дані для першого відкриття
    this.initDefaultData();
  }

  /**
   * Завантаження початкових демонстраційних контактів
   */
  initDefaultData() {
    const defaultData = [
      {
        name: 'Олександр Коваленко',
        phone: '+38 (067) 123-45-67',
        email: 'o.kovalenko@nure.ua',
        group: 'work',
        notes: 'Керівник проєкту, зустріч по середах о 14:00',
        isFavorite: true,
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
      },
      {
        name: 'Марія Мельник',
        phone: '+38 (050) 987-65-43',
        email: 'maria.melnyk@gmail.com',
        group: 'family',
        notes: 'Сестра, день народження 15 травня',
        isFavorite: true,
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
      },
      {
        name: 'Дмитро Шевченко',
        phone: '+38 (093) 456-78-90',
        email: 'dmytro.shev@dev.io',
        group: 'friends',
        notes: 'Спільні тренування з баскетболу щовівторка',
        isFavorite: false,
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
      },
      {
        name: 'Катерина Бондаренко',
        phone: '+38 (097) 222-33-44',
        email: 'kate.bond@design.co',
        group: 'work',
        notes: 'UI/UX дизайнерка, узгодження кольорової гами',
        isFavorite: false,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        name: 'Сергій Ткаченко',
        phone: '+38 (063) 111-22-33',
        email: 'sergiy.tk@gmail.com',
        group: 'friends',
        notes: 'Одногрупник F7-КІУКІ з комп’ютерної інженерії',
        isFavorite: true,
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
      },
      {
        name: 'Ярослав Гриценко',
        phone: '+38 (095) 555-77-88',
        email: 'yaroslav.gr@service.ua',
        group: 'other',
        notes: 'Майстер з ремонту ноутбуків',
        isFavorite: false,
        createdAt: new Date().toISOString()
      }
    ];

    this.contacts = defaultData.map(item => new Contact(item));
    this.saveToStorage();
  }

  /**
   * Експорт колекції у рядок формату JSON
   * @returns {string}
   */
  exportJSON() {
    return JSON.stringify(this.contacts.map(c => c.toJSON()), null, 2);
  }

  /**
   * Імпорт контактів із рядка JSON
   * @param {string} jsonString 
   * @returns {{ success: boolean, count?: number, error?: string }}
   */
  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        return { success: false, error: 'JSON повинен містити масив контактів.' };
      }

      let importedCount = 0;
      parsed.forEach(rawItem => {
        if (rawItem && typeof rawItem === 'object' && rawItem.name && (rawItem.phone || rawItem.email)) {
          // Перевірка на дублювання за телефоном або email
          const isDuplicate = this.contacts.some(c => 
            (rawItem.phone && c.phone === rawItem.phone.trim()) || 
            (rawItem.email && c.email.toLowerCase() === rawItem.email.trim().toLowerCase())
          );
          if (!isDuplicate) {
            this.contacts.unshift(new Contact(rawItem));
            importedCount++;
          }
        }
      });

      this.saveToStorage();
      return { success: true, count: importedCount };
    } catch (err) {
      return { success: false, error: err.message || 'Некоректний формат JSON' };
    }
  }

  /**
   * Очищення всієї колекції
   */
  clearAll() {
    this.contacts = [];
    this.saveToStorage();
  }
}

// Експорт класів для глобального використання у браузері або модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Contact, ContactManager };
}
