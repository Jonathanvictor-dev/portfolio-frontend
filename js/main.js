import { login } from "./services/auth.js";
import { createMessage } from "./services/message.js";

const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const fadeElems = document.querySelectorAll('.fade-in');
const contactForm = document.getElementById('contact-form');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginSubmit = document.getElementById('login-submit');
const loginSubmitText = document.getElementById('login-submit-text');
const loginSubmitSpinner = document.getElementById('login-submit-spinner');
const formToast = document.getElementById('form-toast');

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.1 });

fadeElems.forEach(elem => {
    observer.observe(elem);
});

function validateFields() {
    const name = contactForm.name.value.trim();
    const email = contactForm.email.value.trim();
    const message = contactForm.message.value.trim();

    if (!name) {
        contactForm.name.focus();
        return createError('Por favor, preencha seu nome.');
    };

    if (!email.includes('@') || !email.includes('.')) {
        contactForm.email.focus();
        return createError('Por favor, preencha seu e-mail corretamente. Ex: seu@email.com');
    }

    if (!message) {
        contactForm.message.focus();
        return createError('Por favor, preencha sua mensagem.');
    }

    return null;
};

function showMessage() {
    formToast.classList.remove('hidden');

    setTimeout(() => {
        formToast.classList.add('hidden');
    }, 5000);
};

function createError(message) {
    return {
        message,
        icon: 'fa-solid fa-triangle-exclamation text-red-500',
    };
};

function messageError(message, icon) {
    const iconElem = formToast.querySelector('i');

    iconElem.className = icon;
    formToast.querySelector('span').innerHTML = message;
};

function messageSuccess(message) {
    const iconElem = formToast.querySelector('i');

    iconElem.className = 'fa-solid fa-circle-check';
    formToast.querySelector('span').innerHTML = message;
};

menuBtn?.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
    const isOpen = !mobileMenu.classList.contains('hidden');
    menuBtn.setAttribute('aria-expanded', isOpen);

    if (isOpen) {
        menuBtn.innerHTML = '<i class="fa-solid fa-xmark w-6 h-6"></i>';
    } else {
        menuBtn.innerHTML = '<i class="fa-solid fa-bars w-6 h-6"></i>';
    }
});

document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.innerHTML = '<i class="fa-solid fa-bars w-6 h-6"></i>';
    });
});

contactForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = contactForm.name.value.trim();
    const email = contactForm.email.value.trim();
    const message = contactForm.message.value.trim();

    const error = validateFields();

    if (error) {
        const { message, icon } = error;

        messageError(message, icon);
        showMessage();
        return;
    };

    try {
        await createMessage({
            name: name,
            email: email,
            content: message,
        });

        messageSuccess(
            'Mensagem enviada com sucesso! Em breve entrarei em contato.'
        );

        showMessage();
        contactForm.reset();
    } catch (error) {
        messageError(
            error.message || 'Não foi possível enviar a mensagem.', 'fa-solid fa-triangle-exclamation text-red-500'
        );

        showMessage();
    };
});

loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailLogin = loginForm.email.value.trim();
    const password = loginForm.password.value.trim();

    loginError.classList.add('hidden');
    loginError.textContent = '';

    if (!emailLogin || !emailLogin.includes('@') || !emailLogin.includes('.')) {
        loginError.textContent = 'Por favor, preencha um e-mail válido.';
        loginError.classList.remove('hidden');

        return;
    };

    if (!password) {
        loginError.textContent = 'Por favor, preencha sua senha.';
        loginError.classList.remove('hidden');
        return;
    };

    try {
        loginSubmit.disabled = true;
        loginSubmitText.classList.add('hidden');
        loginSubmitSpinner.classList.remove('hidden');

        const response = await login({
            email: emailLogin,
            password: password,
        });

        if (response && response?.data?.token) {
            localStorage.setItem('token', response.data.token);
            window.location.href = 'admin.html';
        };

    } catch (error) {
        loginError.textContent = error.message || 'Não foi possível realizar o login.';
        loginError.classList.remove('hidden');
    } finally {
        loginSubmit.disabled = false;
        loginSubmitText.classList.remove('hidden');
        loginSubmitSpinner.classList.add('hidden');
    };
});


