describe('AI Fallback Mechanism', () => {
  it('should fall back to regex parser when LLM fails for Patient Priya', async () => {
    const callAI = jest.fn().mockRejectedValue(new Error('GenAI API quota exceeded'));
    
    const regexParser = (text) => {
      if (text.toLowerCase().includes('tomorrow')) return { date: 'tomorrow' };
      return null;
    };

    const processQuery = async (text) => {
      try {
        return await callAI(text);
      } catch (e) {
        return regexParser(text);
      }
    };

    const result = await processQuery("Book appointment for Priya for tomorrow");
    expect(callAI).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ date: 'tomorrow' });
  });
});
