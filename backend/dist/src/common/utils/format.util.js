"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCurrency = formatCurrency;
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
const currencyFormatter = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
});
function formatCurrency(value) {
    const num = Number(value);
    return currencyFormatter.format(Number.isFinite(num) ? num : 0);
}
const dateFormatter = new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
});
const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});
function formatDate(value) {
    return dateFormatter.format(new Date(value));
}
function formatDateTime(value) {
    return dateTimeFormatter.format(new Date(value));
}
