(function () {
  'use strict';

  if (API.sessao()) {
    window.location.replace('/app.html');
    return;
  }

  const form = document.getElementById('form-login');
  const erro = document.getElementById('erro-login');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erro.hidden = true;
    const botao = form.querySelector('button');
    botao.disabled = true;
    botao.textContent = 'Entrando...';

    try {
      const dados = await API.post('/auth/login', {
        email: form.email.value.trim(),
        senha: form.senha.value,
      });
      API.salvarSessao(dados);
      window.location.replace('/app.html');
    } catch (err) {
      erro.textContent = err.message;
      erro.hidden = false;
      botao.disabled = false;
      botao.textContent = 'Entrar';
    }
  });
})();
