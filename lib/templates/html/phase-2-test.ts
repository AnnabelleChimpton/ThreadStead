/**
 * Phase 2 (Roadmap) Test Template
 *
 * Tests 7 new components from Phase 2:
 * - Count - Count array items with optional filter
 * - Sum - Sum numeric values in arrays
 * - Get - Dynamic property/index access
 * - Filter - Filter arrays by condition
 * - Find - Find first matching item
 * - Transform - Map/transform array items
 * - Sort - Sort arrays by property or expression
 *
 * This template demonstrates:
 * 1. Collection operations on arrays of objects
 * 2. Expression evaluation with 'item' context
 * 3. Chained operations (Filter → Sort → Transform)
 * 4. Real-world use cases (product catalog, data analysis)
 */

export const phase2TestTemplate = `
<div style="padding: 40px; max-width: 900px; margin: 0 auto; font-family: system-ui;">
  <h1>Phase 2: Collection Operations</h1>
  <p style="color: #666; margin-bottom: 40px;">
    Testing Filter, Sort, Transform, Find, Count, Sum, and Get components for powerful array manipulation
  </p>

  <!-- ============================================ -->
  <!-- Test 1: Product Catalog - Filter & Count -->
  <!-- ============================================ -->
  <div style="border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
    <h2>Test 1: Filter & Count</h2>

    <Var name="products" type="array" initial='[
      {"name":"Laptop","price":999,"category":"tech","inStock":true},
      {"name":"Mouse","price":29,"category":"tech","inStock":true},
      {"name":"Keyboard","price":79,"category":"tech","inStock":false},
      {"name":"Desk","price":299,"category":"furniture","inStock":true},
      {"name":"Chair","price":199,"category":"furniture","inStock":true},
      {"name":"Monitor","price":399,"category":"tech","inStock":true}
    ]' />

    <Var name="techProducts" type="array" initial="[]" />
    <Var name="inStockProducts" type="array" initial="[]" />
    <Var name="techCount" type="number" initial="0" />
    <Var name="inStockCount" type="number" initial="0" />

    <div style="display: flex; gap: 10px; margin: 20px 0;">
      <Button style="background: #2196F3; color: white; padding: 10px 20px; border: none; border-radius: 4px;">
        <OnClick>
          <Filter var="products" target="techProducts" where="item.category === 'tech'" />
          <Count var="techProducts" target="techCount" />
          <ShowToast message="Filtered tech products" type="success" />
        </OnClick>
        Filter Tech Products
      </Button>

      <Button style="background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 4px;">
        <OnClick>
          <Filter var="products" target="inStockProducts" where="item.inStock === true" />
          <Count var="inStockProducts" target="inStockCount" />
          <ShowToast message="Filtered in-stock products" type="success" />
        </OnClick>
        Filter In-Stock
      </Button>
    </div>

    <div style="background: #f5f5f5; padding: 15px; border-radius: 4px;">
      <div><strong>Tech Products Count:</strong> <ShowVar name="techCount" /></div>
      <div><strong>In-Stock Count:</strong> <ShowVar name="inStockCount" /></div>
    </div>
  </div>

  <!-- ============================================ -->
  <!-- Test 2: Sort Products by Price -->
  <!-- ============================================ -->
  <div style="border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
    <h2>Test 2: Sort Arrays</h2>

    <Var name="sortedProducts" type="array" initial="[]" />

    <div style="display: flex; gap: 10px; margin: 20px 0;">
      <Button style="background: #9C27B0; color: white; padding: 10px 20px; border: none; border-radius: 4px;">
        <OnClick>
          <Sort var="products" target="sortedProducts" by="item.price" order="asc" />
          <ShowToast message="Sorted by price (low to high)" type="info" />
        </OnClick>
        Sort by Price ↑
      </Button>

      <Button style="background: #673AB7; color: white; padding: 10px 20px; border: none; border-radius: 4px;">
        <OnClick>
          <Sort var="products" target="sortedProducts" by="item.price" order="desc" />
          <ShowToast message="Sorted by price (high to low)" type="info" />
        </OnClick>
        Sort by Price ↓
      </Button>

      <Button style="background: #3F51B5; color: white; padding: 10px 20px; border: none; border-radius: 4px;">
        <OnClick>
          <Sort var="products" target="sortedProducts" by="item.name" order="asc" />
          <ShowToast message="Sorted by name (A-Z)" type="info" />
        </OnClick>
        Sort by Name
      </Button>
    </div>

    <div style="background: #f5f5f5; padding: 15px; border-radius: 4px;">
      <div><strong>Sorted Products:</strong></div>
      <ForEach var="sortedProducts" item="product" index="i">
        <div style="padding: 5px 0;">{i + 1}. {product.name} - {'$'}{product.price}</div>
      </ForEach>
    </div>
  </div>

  <!-- ============================================ -->
  <!-- Test 3: Sum & Transform -->
  <!-- ============================================ -->
  <div style="border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
    <h2>Test 3: Sum & Transform</h2>

    <Var name="totalValue" type="number" initial="0" />
    <Var name="pricesWithTax" type="array" initial="[]" />
    <Var name="totalWithTax" type="number" initial="0" />

    <div style="display: flex; gap: 10px; margin: 20px 0;">
      <Button style="background: #FF9800; color: white; padding: 10px 20px; border: none; border-radius: 4px;">
        <OnClick>
          <Sum var="products" target="totalValue" property="price" />
          <ShowToast message="Calculated total value" type="success" />
        </OnClick>
        Sum Total Value
      </Button>

      <Button style="background: #FF5722; color: white; padding: 10px 20px; border: none; border-radius: 4px;">
        <OnClick>
          <Transform var="products" target="pricesWithTax" expression="item.price * 1.08" />
          <Sum var="pricesWithTax" target="totalWithTax" />
          <ShowToast message="Applied 8% tax" type="success" />
        </OnClick>
        Apply Tax & Sum
      </Button>
    </div>

    <div style="background: #f5f5f5; padding: 15px; border-radius: 4px;">
      <div><strong>Total Value:</strong> $<ShowVar name="totalValue" /></div>
      <div><strong>Total with Tax (8%):</strong> $<ShowVar name="totalWithTax" /></div>
    </div>
  </div>

  <!-- ============================================ -->
  <!-- Test 4: Find & Get -->
  <!-- ============================================ -->
  <div style="border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
    <h2>Test 4: Find & Get</h2>

    <Var name="searchCategory" type="string" initial="furniture" />
    <Var name="foundProduct" type="string" initial="{}" />
    <Var name="currentIndex" type="number" initial="0" />
    <Var name="currentProduct" type="string" initial="{}" />

    <div style="margin: 20px 0;">
      <label>Search Category:</label>
      <TInput var="searchCategory" placeholder="tech, furniture" />
    </div>

    <div style="display: flex; gap: 10px; margin: 20px 0;">
      <Button style="background: #00BCD4; color: white; padding: 10px 20px; border: none; border-radius: 4px;">
        <OnClick>
          <Find var="products" target="foundProduct" where="item.category === $vars.searchCategory" />
          <ShowToast message="Found first match" type="success" />
        </OnClick>
        Find Product
      </Button>

      <Button style="background: #009688; color: white; padding: 10px 20px; border: none; border-radius: 4px;">
        <OnClick>
          <Get from="products" at="$vars.currentIndex" target="currentProduct" />
          <ShowToast message="Got product at index" type="info" />
        </OnClick>
        Get by Index
      </Button>
    </div>

    <div style="margin: 20px 0;">
      <label>Current Index: <ShowVar name="currentIndex" /></label>
      <div style="display: flex; gap: 10px; margin-top: 10px;">
        <Button>
          <OnClick><Decrement var="currentIndex" min="0" /></OnClick>
          Previous
        </Button>
        <Button>
          <OnClick><Increment var="currentIndex" max="5" /></OnClick>
          Next
        </Button>
      </div>
    </div>

    <div style="background: #f5f5f5; padding: 15px; border-radius: 4px;">
      <div><strong>Found Product:</strong> <ShowVar name="foundProduct" /></div>
      <div><strong>Current Product:</strong> <ShowVar name="currentProduct" /></div>
    </div>
  </div>

  <!-- ============================================ -->
  <!-- Test 5: Chained Operations -->
  <!-- ============================================ -->
  <div style="border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
    <h2>Test 5: Chained Operations</h2>

    <Var name="expensiveTech" type="array" initial="[]" />
    <Var name="expensiveTechSorted" type="array" initial="[]" />
    <Var name="expensiveTechNames" type="array" initial="[]" />

    <Button style="background: #E91E63; color: white; padding: 10px 20px; border: none; border-radius: 4px;">
      <OnClick>
        <Filter var="products" target="expensiveTech" where="item.category === 'tech' && item.price > 100" />
        <Sort var="expensiveTech" target="expensiveTechSorted" by="item.price" order="desc" />
        <Transform var="expensiveTechSorted" target="expensiveTechNames" expression="item.name" />
        <ShowToast message="Filtered → Sorted → Transformed" type="success" />
      </OnClick>
      Filter Tech > $100, Sort, Extract Names
    </Button>

    <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; margin-top: 20px;">
      <div><strong>Result:</strong></div>
      <ForEach var="expensiveTechNames" item="name" index="i">
        <div>{i + 1}. {name}</div>
      </ForEach>
    </div>
  </div>

  <!-- ============================================ -->
  <!-- Summary -->
  <!-- ============================================ -->
  <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-top: 40px;">
    <h2>Phase 2 Components Summary</h2>
    <ul style="line-height: 1.8;">
      <li><strong>✅ Count</strong> - Count array items with optional filter condition</li>
      <li><strong>✅ Sum</strong> - Sum numeric values in arrays (with property path support)</li>
      <li><strong>✅ Get</strong> - Dynamically access object properties or array indices</li>
      <li><strong>✅ Filter</strong> - Filter arrays by condition (item context)</li>
      <li><strong>✅ Find</strong> - Find first item matching condition</li>
      <li><strong>✅ Transform</strong> - Transform/map array items with expressions</li>
      <li><strong>✅ Sort</strong> - Sort arrays by property or expression (asc/desc)</li>
    </ul>
    <p style="margin-top: 20px; color: #666;">
      All components fully integrated with visual builder, islands architecture, and expression evaluator.
      Supports chained operations for complex data transformations.
    </p>
  </div>
</div>
`;
