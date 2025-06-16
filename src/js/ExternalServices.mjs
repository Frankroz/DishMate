// js/ExternalServices.mjs

async function convertToJson(res) {
  const jsonResponse = await res.json();
  if (res.ok) {
    return jsonResponse;
  } else {
    throw { name: "servicesError", message: jsonResponse };
  }
}

export default class ExternalServices {
  async get(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`, await response.text());
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await convertToJson(response);
      return data;
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }
}