from decimal import Decimal
from app.models import Product


def seed_test_products(db):
    """Seed test products with distinct prices, categories, dates, and stocks."""
    products = [
        Product(
            title="Personalized Wooden Watch",
            slug="personalized-wooden-watch",
            category="Watches",
            price=Decimal("1999.00"),
            description="Handcrafted wooden watch with engraving.",
            rating=4.9,
            stock=15,
            is_active=True,
            is_featured=True,
        ),
        Product(
            title="Custom Engraved Silver Ring",
            slug="custom-engraved-silver-ring",
            category="Jewelry",
            price=Decimal("999.00"),
            description="Sterling silver ring with custom name.",
            rating=4.7,
            stock=5,
            is_active=True,
            is_featured=False,
        ),
        Product(
            title="Personalized Photo Mug",
            slug="personalized-photo-mug",
            category="Keepsakes",
            price=Decimal("499.00"),
            description="Ceramic mug with photo printing.",
            rating=4.2,
            stock=0,  # Out of stock
            is_active=True,
            is_featured=False,
        ),
        Product(
            title="Custom Leather Wallet",
            slug="custom-leather-wallet",
            category="Accessories",
            price=Decimal("1299.00"),
            description="Genuine leather wallet with initials.",
            rating=4.6,
            stock=20,
            is_active=True,
            is_featured=True,
        ),
        Product(
            title="Inactive Secret Gift",
            slug="inactive-secret-gift",
            category="Keepsakes",
            price=Decimal("100.00"),
            description="Should never appear in active lists.",
            rating=1.0,
            stock=10,
            is_active=False,
            is_featured=False,
        ),
    ]
    for p in products:
        db.add(p)
    db.commit()


def test_search_by_name_and_keyword(client, db):
    seed_test_products(db)

    # Search title
    res = client.get("/api/products?search=Watch")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Personalized Wooden Watch"

    # Search keyword in description
    res = client.get("/api/products?search=Ceramic")
    assert res.status_code == 200
    assert res.json()["total"] == 1
    assert res.json()["items"][0]["title"] == "Personalized Photo Mug"

    # Inactive product is excluded
    res = client.get("/api/products?search=Secret")
    assert res.status_code == 200
    assert res.json()["total"] == 0


def test_category_filter(client, db):
    seed_test_products(db)

    res = client.get("/api/products?category=Jewelry")
    assert res.status_code == 200
    assert res.json()["total"] == 1
    assert res.json()["items"][0]["category"] == "Jewelry"

    # Category "all" returns all active products
    res = client.get("/api/products?category=all")
    assert res.status_code == 200
    assert res.json()["total"] == 4


def test_canonical_category_mapping_and_aliases(client, db):
    """Verify canonical category mapping, case insensitivity, and aliases (Change 5)."""
    p1 = Product(
        title="Personalized Coffee Mug",
        slug="personalized-coffee-mug",
        category="Customize Mugs",
        price=Decimal("499.00"),
        description="Ceramic photo mug",
        rating=4.8,
        stock=10,
        is_active=True,
    )
    p2 = Product(
        title="Custom Photo Frame",
        slug="custom-photo-frame-unique",
        category="Photo Frames",
        price=Decimal("899.00"),
        description="Wooden picture frame",
        rating=4.9,
        stock=8,
        is_active=True,
    )
    db.add_all([p1, p2])
    db.commit()

    # Querying canonical "Mugs" matches "Customize Mugs"
    res = client.get("/api/products?category=Mugs")
    assert res.status_code == 200
    assert any(item["title"] == "Personalized Coffee Mug" for item in res.json()["items"])

    # Querying lowercase "mugs" matches
    res_lower = client.get("/api/products?category=mugs")
    assert res_lower.status_code == 200
    assert any(item["title"] == "Personalized Coffee Mug" for item in res_lower.json()["items"])

    # Querying canonical "Frames" matches "Photo Frames"
    res_frames = client.get("/api/products?category=Frames")
    assert res_frames.status_code == 200
    assert any(item["title"] == "Custom Photo Frame" for item in res_frames.json()["items"])

    # Whitespace in category query parameter is handled safely
    res_ws = client.get("/api/products?category=%20Mugs%20")
    assert res_ws.status_code == 200
    assert any(item["title"] == "Personalized Coffee Mug" for item in res_ws.json()["items"])

    # Unknown category returns 0 products safely without 500 error
    res_unknown = client.get("/api/products?category=NonExistent999")
    assert res_unknown.status_code == 200
    assert res_unknown.json()["total"] == 0


def test_categories_endpoint_deduplication(client, db):
    """Verify /api/products/categories returns deduplicated, canonical, sorted categories."""
    p1 = Product(
        title="Mug A",
        slug="mug-a",
        category=" Customize Mugs ",  # un-trimmed
        price=Decimal("499.00"),
        description="Ceramic mug A",
        stock=10,
        is_active=True,
    )
    p2 = Product(
        title="Mug B",
        slug="mug-b",
        category="Customize Mugs",  # alias
        price=Decimal("549.00"),
        description="Ceramic mug B",
        stock=10,
        is_active=True,
    )
    p3 = Product(
        title="Mug C",
        slug="mug-c",
        category="Mugs",  # canonical
        price=Decimal("599.00"),
        description="Ceramic mug C",
        stock=10,
        is_active=True,
    )
    db.add_all([p1, p2, p3])
    db.commit()

    res = client.get("/api/products/categories")
    assert res.status_code == 200
    cats = res.json()
    # "Mugs" must appear exactly once despite different dirty representations
    assert cats.count("Mugs") == 1
    # No duplicate categories allowed
    assert len(cats) == len(set(cats))


def test_price_range_filtering(client, db):
    seed_test_products(db)

    # Min price only (>= 1000)
    res = client.get("/api/products?min_price=1000")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 2
    assert all(Decimal(str(item["price"])) >= Decimal("1000") for item in items)

    # Max price only (<= 1000)
    res = client.get("/api/products?max_price=1000")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 2
    assert all(Decimal(str(item["price"])) <= Decimal("1000") for item in items)

    # Price range (500 to 1500)
    res = client.get("/api/products?min_price=500&max_price=1500")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 2  # Ring (999) and Wallet (1299)
    titles = [x["title"] for x in items]
    assert "Custom Engraved Silver Ring" in titles
    assert "Custom Leather Wallet" in titles

    # Invalid price range: min_price > max_price
    res = client.get("/api/products?min_price=2000&max_price=500")
    assert res.status_code == 400


def test_in_stock_filter(client, db):
    seed_test_products(db)

    # In stock only
    res = client.get("/api/products?in_stock=true")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 3
    assert all(item["stock"] > 0 for item in items)

    # Out of stock only
    res = client.get("/api/products?in_stock=false")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 1
    assert items[0]["title"] == "Personalized Photo Mug"


def test_sorting_options(client, db):
    seed_test_products(db)

    # Price ascending
    res = client.get("/api/products?sort_by=price_asc")
    assert res.status_code == 200
    prices = [Decimal(str(x["price"])) for x in res.json()["items"]]
    assert prices == sorted(prices)

    # Price descending
    res = client.get("/api/products?sort_by=price_desc")
    assert res.status_code == 200
    prices = [Decimal(str(x["price"])) for x in res.json()["items"]]
    assert prices == sorted(prices, reverse=True)

    # Rating descending
    res = client.get("/api/products?sort_by=rating")
    assert res.status_code == 200
    ratings = [x["rating"] for x in res.json()["items"]]
    assert ratings == sorted(ratings, reverse=True)


def test_pagination_and_combined_filters(client, db):
    seed_test_products(db)

    # Combined filter: in_stock=true, page_size=2, page=1
    res = client.get("/api/products?in_stock=true&page=1&page_size=2&sort_by=price_asc")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 3
    assert data["pages"] == 2
    assert data["page"] == 1
    assert len(data["items"]) == 2
    assert Decimal(str(data["items"][0]["price"])) <= Decimal(str(data["items"][1]["price"]))

    # Page 2
    res_page2 = client.get("/api/products?in_stock=true&page=2&page_size=2&sort_by=price_asc")
    assert res_page2.status_code == 200
    data_page2 = res_page2.json()
    assert len(data_page2["items"]) == 1
    assert data_page2["page"] == 2
    # Ensure items on page 1 and page 2 are completely distinct
    page1_ids = {x["id"] for x in data["items"]}
    page2_ids = {x["id"] for x in data_page2["items"]}
    assert not (page1_ids & page2_ids)
