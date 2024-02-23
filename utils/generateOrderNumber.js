const generateOrderNumber = () => {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const getRandomChar = () => characters.charAt(Math.floor(Math.random() * characters.length));

    const randomCharTypes = [getRandomChar().toUpperCase(), getRandomChar().toLowerCase(), getRandomChar()];
    const remainingChars = Array.from({ length: 4 }, () => getRandomChar());

    const orderNumber = `#${randomCharTypes.join('')}${remainingChars.join('')}`;

    return orderNumber;
}

module.exports = generateOrderNumber