import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useRouter } from 'next/router';

interface CompactNode {
  id: string;
  n: string;  // name
  s: string;  // slug
  d: number;  // directChildrenCount
  t: number;  // totalDescendantsCount
  p?: string; // parentId
  c?: CompactNode[]; // children
  _collapsed?: boolean; // UI state
  _loading?: boolean; // UI state
}

interface OptimizedGenealogyProps {
  initialMaxDepth?: number;
  enableVirtualization?: boolean;
}

export default function ThreadRingGenealogyOptimized({ 
  initialMaxDepth = 2,
  enableVirtualization = true
}: OptimizedGenealogyProps) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<CompactNode | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(new Set());
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  // Initial data fetch - shallow tree only
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/threadrings/genealogy-optimized?maxDepth=${initialMaxDepth}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch genealogy data');
        }

        setData(result.tree);
        setStats(result.stats);
        setError(null);
      } catch (err) {
        console.error('Error fetching genealogy:', err);
        setError(err instanceof Error ? err.message : 'Failed to load genealogy');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [initialMaxDepth]);

  // Lazy load children when expanding a node
  const loadChildren = useCallback(async (nodeId: string, lineagePath: string[]) => {
    try {
      const pathStr = [...lineagePath, nodeId].join(',');
      const response = await fetch(`/api/threadrings/genealogy-optimized?expandPath=${pathStr}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load children');
      }

      // Merge the new data into existing tree
      setData(prevData => {
        if (!prevData) return result.tree;
        
        // Deep clone and merge
        const merged = JSON.parse(JSON.stringify(prevData));
        mergeTreeData(merged, result.tree);
        return merged;
      });

      // Add to expanded paths
      setExpandedPaths(prev => new Set([...prev, nodeId]));
    } catch (err) {
      console.error('Error loading children:', err);
    }
  }, []);

  // Merge new tree data into existing tree
  const mergeTreeData = (target: CompactNode, source: CompactNode) => {
    if (target.id === source.id) {
      // Update children if source has more detail
      if (source.c && (!target.c || source.c.length > target.c.length)) {
        target.c = source.c;
      }
      return;
    }

    // Recursively search for merge point
    if (target.c) {
      for (const child of target.c) {
        mergeTreeData(child, source);
      }
    }
  };

  // Render D3 tree with optimizations
  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 120, bottom: 20, left: 120 };
    const width = 1200 - margin.left - margin.right;
    const height = 800 - margin.top - margin.bottom;

    const g = svg
      .attr("width", 1200)
      .attr("height", 800)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    gRef.current = g;

    // Create tree layout
    const treeLayout = d3.tree<CompactNode>()
      .size([height, width])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.5));

    // Create hierarchy with collapsed state
    const root = d3.hierarchy(data);
    
    // Collapse nodes beyond initial depth for performance
    root.each((node: any) => {
      if (node.depth >= initialMaxDepth && node.children) {
        node._children = node.children;
        node.children = null;
        node.data._collapsed = true;
      }
    });

    // Update function for tree
    const update = (source: d3.HierarchyNode<CompactNode>) => {
      // Compute new tree layout
      const treeData = treeLayout(root);
      const nodes = treeData.descendants();
      const links = treeData.links();

      // Performance: Only render visible nodes (virtualization)
      const visibleNodeSet = new Set<string>();
      if (enableVirtualization && zoomRef.current) {
        // Calculate which nodes are in viewport
        const transform = d3.zoomTransform(svg.node()!);
        const [x0, y0] = transform.invert([0, 0]);
        const [x1, y1] = transform.invert([1200, 800]);
        
        nodes.forEach(d => {
          const node = d as any;
          if (node.y >= x0 - 200 && node.y <= x1 + 200 && 
              node.x >= y0 - 200 && node.x <= y1 + 200) {
            visibleNodeSet.add(node.data.id);
          }
        });
      } else {
        // Render all if virtualization disabled
        nodes.forEach(d => visibleNodeSet.add((d as any).data.id));
      }
      
      setVisibleNodes(visibleNodeSet);

      // Filter to visible nodes only
      const visibleNodesData = nodes.filter(d => visibleNodeSet.has((d as any).data.id));
      const visibleLinksData = links.filter(d => 
        visibleNodeSet.has((d.source as any).data.id) && 
        visibleNodeSet.has((d.target as any).data.id)
      );

      // Update links
      const link = g.selectAll(".link")
        .data(visibleLinksData, (d: any) => d.target.data.id);

      link.exit().remove();

      link.enter().append("path")
        .attr("class", "link")
        .merge(link as any)
        .attr("d", d3.linkHorizontal<any, any>()
          .x(d => d.y)
          .y(d => d.x))
        .style("fill", "none")
        .style("stroke", "#64748b")
        .style("stroke-width", 1.5)
        .style("opacity", 0.6);

      // Update nodes
      const node = g.selectAll(".node")
        .data(visibleNodesData, (d: any) => d.data.id);

      node.exit().remove();

      const nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", (d: any) => `translate(${source.y || 0},${source.x || 0})`)
        .style("cursor", "pointer");

      // Add circles
      nodeEnter.append("circle")
        .attr("r", 4)
        .style("fill", (d: any) => {
          if (d.data._collapsed) return "#fbbf24"; // Has hidden children
          if (d.data.t > 0) return "#8b5cf6";
          return "#10b981";
        });

      // Add labels (simplified for performance)
      nodeEnter.append("text")
        .attr("dy", ".31em")
        .attr("x", (d: any) => d.children || d._children ? -10 : 10)
        .style("text-anchor", (d: any) => d.children || d._children ? "end" : "start")
        .style("font-size", "11px")
        .text((d: any) => d.data.n);

      // Add count badge
      nodeEnter.append("text")
        .attr("dy", "1.5em")
        .attr("x", 0)
        .style("text-anchor", "middle")
        .style("font-size", "9px")
        .style("fill", "#64748b")
        .text((d: any) => d.data.t > 0 ? `${d.data.t}` : '');

      // Merge and transition
      const nodeUpdate = nodeEnter.merge(node as any);
      
      nodeUpdate.transition()
        .duration(300)
        .attr("transform", (d: any) => `translate(${d.y},${d.x})`);

      nodeUpdate.select("circle")
        .style("fill", (d: any) => {
          if (d.data._loading) return "#fde047"; // Loading
          if (d.data._collapsed) return "#fbbf24"; // Has hidden children
          if (d.data.t > 0) return "#8b5cf6";
          return "#10b981";
        });

      // Click handler for expand/collapse and navigation
      nodeUpdate.on("click", async function(event: any, d: any) {
        event.stopPropagation();
        
        // Shift+click to navigate
        if (event.shiftKey) {
          router.push(`/threadrings/${d.data.s}`);
          return;
        }

        // Toggle collapse or load children
        if (d.data.d > 0) { // Has children
          if (d.children) {
            // Collapse
            d._children = d.children;
            d.children = null;
            d.data._collapsed = true;
          } else if (d._children) {
            // Expand (already loaded)
            d.children = d._children;
            d._children = null;
            d.data._collapsed = false;
          } else if (!d.data._loading) {
            // Load children
            d.data._loading = true;
            update(d);
            
            // Build lineage path
            const path: string[] = [];
            let current = d.parent;
            while (current) {
              path.unshift((current as any).data.id);
              current = current.parent;
            }
            
            await loadChildren(d.data.id, path);
            d.data._loading = false;
          }
          update(d);
        }
      });

      // Tooltip on hover (simplified)
      nodeUpdate.on("mouseover", function(event: any, d: any) {
        const tooltip = d3.select("body").append("div")
          .attr("class", "genealogy-tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0, 0, 0, 0.9)")
          .style("color", "white")
          .style("padding", "6px 10px")
          .style("border-radius", "4px")
          .style("font-size", "11px")
          .style("pointer-events", "none");

        tooltip.html(`
          <strong>${d.data.n}</strong><br/>
          Direct: ${d.data.d} | Total: ${d.data.t}<br/>
          <em>Shift+click to visit</em>
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.selectAll(".genealogy-tooltip").remove();
      });
    };

    // Initial update
    update(root);

    // Setup zoom with viewport culling
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
        
        // Trigger re-render for virtualization
        if (enableVirtualization) {
          update(root);
        }
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Initial zoom to fit
    const bounds = g.node()?.getBBox();
    if (bounds) {
      const fullWidth = 1200;
      const fullHeight = 800;
      const widthScale = fullWidth / bounds.width;
      const heightScale = fullHeight / bounds.height;
      const midX = bounds.x + bounds.width / 2;
      const midY = bounds.y + bounds.height / 2;
      const scale = 0.8 * Math.min(widthScale, heightScale, 1);
      
      const initialTransform = d3.zoomIdentity
        .translate(fullWidth / 2, fullHeight / 2)
        .scale(scale)
        .translate(-midX, -midY);
      
      svg.call(zoom.transform, initialTransform);
    }

  }, [data, router, loadChildren, initialMaxDepth, enableVirtualization]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading genealogy tree...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      {stats && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-gray-600">Loaded:</span>
              <span className="ml-2 font-semibold">{stats.loadedNodes} / {stats.totalNodes} nodes</span>
              {stats.hasMore && (
                <span className="ml-2 text-xs text-gray-500">(click nodes to expand)</span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {enableVirtualization && `Rendering: ${visibleNodes.size} visible nodes`}
            </div>
          </div>
        </div>
      )}
      
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <svg ref={svgRef}></svg>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        <strong>Performance Mode:</strong> Click to expand/collapse • Shift+Click to visit • 
        {enableVirtualization ? ' Viewport virtualization enabled' : ' Full rendering'}
      </div>
    </div>
  );
}