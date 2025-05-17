/****************************************************
 * File: login.js
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const
    input = document.getElementById("input"),
    button = document.getElementById('next-button');

  button.disabled = !input.value;

  input.addEventListener('input', () => {
    input.parentElement.removeAttribute('data-error');
    button.disabled = !input.value;
  });

  button.addEventListener('click', () =>
    button.disabled = input.disabled = true
  );
});