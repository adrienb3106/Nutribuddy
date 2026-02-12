from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from foods.models import FoodItem


class FoodItemApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.list_url = reverse("food-list")

    def _create_food(self, **overrides):
        data = {
            "name": "Test Food",
            "source": FoodItem.Source.CIQUAL,
            "kcal_100g": 100,
            "protein_g_100g": 5,
            "carbs_g_100g": 10,
            "fat_g_100g": 2,
            "vegan": False,
            "vegetarian": False,
            "pescetarian": False,
            "gluten_free": False,
            "lactose_free": False,
        }
        data.update(overrides)
        return FoodItem.objects.create(**data)

    def test_create_food_item(self):
        payload = {
            "name": "Carrot",
            "source": FoodItem.Source.CIQUAL,
            "kcal_100g": 41,
            "protein_g_100g": 0.9,
            "carbs_g_100g": 9.6,
            "fat_g_100g": 0.2,
            "vegan": True,
            "vegetarian": True,
            "pescetarian": True,
            "gluten_free": True,
            "lactose_free": True,
            "irritability_level": FoodItem.Irritability.LOW_FODMAP,
        }

        response = self.client.post(self.list_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FoodItem.objects.count(), 1)
        self.assertEqual(FoodItem.objects.first().name, "Carrot")

    def test_filter_vegan_true(self):
        self._create_food(name="Apple", vegan=True, vegetarian=True, pescetarian=True)
        self._create_food(name="Egg", vegan=False, vegetarian=True, pescetarian=True)

        response = self.client.get(self.list_url, {"vegan": "true"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.data["results"]]
        self.assertIn("Apple", names)
        self.assertNotIn("Egg", names)

    def test_filter_kcal_max(self):
        self._create_food(name="Light", kcal_100g=50)
        self._create_food(name="Heavy", kcal_100g=300)

        response = self.client.get(self.list_url, {"kcal_max": 100})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.data["results"]]
        self.assertIn("Light", names)
        self.assertNotIn("Heavy", names)

    def test_filter_irritability_level(self):
        self._create_food(name="Low FODMAP", irritability_level=FoodItem.Irritability.LOW_FODMAP)
        self._create_food(name="High FODMAP", irritability_level=FoodItem.Irritability.HIGH_FODMAP)

        response = self.client.get(
            self.list_url, {"irritability_level": FoodItem.Irritability.LOW_FODMAP}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.data["results"]]
        self.assertIn("Low FODMAP", names)
        self.assertNotIn("High FODMAP", names)

    def test_search(self):
        self._create_food(name="Haricot vert")
        self._create_food(name="Tomate")

        response = self.client.get(self.list_url, {"search": "haricot"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.data["results"]]
        self.assertIn("Haricot vert", names)
        self.assertNotIn("Tomate", names)

    def test_pagination(self):
        for i in range(60):
            self._create_food(name=f"Food {i}")

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 50)
        self.assertIsNotNone(response.data.get("next"))

    def test_ordering(self):
        self._create_food(name="Low", kcal_100g=10)
        self._create_food(name="High", kcal_100g=500)

        response = self.client.get(self.list_url, {"ordering": "-kcal_100g"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.data["results"]]
        self.assertEqual(names[0], "High")
