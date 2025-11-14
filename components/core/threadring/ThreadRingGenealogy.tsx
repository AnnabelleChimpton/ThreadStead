import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useRouter } from 'next/router';

interface ThreadRingNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
  postCount: number;
  directChildrenCount: number;
  totalDescendantsCount: number;
  lineageDepth: number;
  curatorHandle: string | null;
  createdAt: string;
  children?: ThreadRingNode[];
}

interface GenealogyStats {
  totalRings: number;
  totalMembers: number;
  totalPosts: number;
  totalActors?: number;
  maxDepth: number;
  averageChildren: number;
}

interface ThreadRingGenealogyProps {
  initialRootId?: string;
  maxInitialDepth?: number;
}

export default function ThreadRingGenealogy({ 
  initialRootId, 
  maxInitialDepth = 3 
}: ThreadRingGenealogyProps) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<ThreadRingNode | null>(null);
  const [stats, setStats] = useState<GenealogyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  // Fetch genealogy data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (initialRootId) params.append('rootId', initialRootId);
        params.append('maxDepth', maxInitialDepth.toString());

        const response = await fetch(`/api/threadrings/genealogy?${params}`);
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

    fetchData();
  }, [initialRootId, maxInitialDepth]);

  // Render D3 tree
  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous rendering

    const margin = { top: 40, right: 120, bottom: 40, left: 120 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const g = svg
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Detect mobile for responsive tree sizing
    const isMobile = window.innerWidth < 768;

    // On mobile, multiply width to spread tree horizontally for better readability
    const treeWidth = isMobile ? width * 5 : width;

    // Create tree layout
    const treeLayout = d3.tree<ThreadRingNode>()
      .size([height, treeWidth])
      .separation((a, b) => {
        // Increase separation for nodes with many children
        const aChildren = a.data.directChildrenCount || 0;
        const bChildren = b.data.directChildrenCount || 0;
        const baseSeparation = (a.parent === b.parent ? 1 : 2) * (1 + Math.min(aChildren + bChildren, 10) * 0.1);
        // Increase separation even more on mobile for readability
        return isMobile ? baseSeparation * 2 : baseSeparation;
      });

    // Create hierarchy
    const root = d3.hierarchy(data);
    const treeData = treeLayout(root);

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoom);

    // Draw links
    const link = g.selectAll(".link")
      .data(treeData.links())
      .enter().append("path")
      .attr("class", "link")
      .attr("d", d3.linkHorizontal<any, any>()
        .x(d => d.y)
        .y(d => d.x))
      .style("fill", "none")
      .style("stroke", "#475569")
      .style("stroke-width", 1.5)
      .style("opacity", 0.75);

    // Draw nodes
    const node = g.selectAll(".node")
      .data(treeData.descendants())
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.y},${d.x})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        router.push(`/tr/${d.data.slug}`);
      });

    // Add circles for nodes
    node.append("circle")
      .attr("r", d => {
        // Size based on total descendants
        const size = Math.sqrt(d.data.totalDescendantsCount + 1) * 3;
        return Math.min(Math.max(size, 4), 20);
      })
      .style("fill", d => {
        if (d.data.id === 'the-spool' || d.data.id === 'virtual-root') return "#6366f1";
        if (d.data.totalDescendantsCount > 10) return "#8b5cf6";
        if (d.data.totalDescendantsCount > 5) return "#ec4899";
        if (d.data.totalDescendantsCount > 0) return "#f97316";
        return "#10b981";
      })
      .style("stroke", "#fff")
      .style("stroke-width", 2);

    // Add labels
    node.append("text")
      .attr("dy", ".31em")
      .attr("x", d => d.children ? -10 : 10)
      .style("text-anchor", d => d.children ? "end" : "start")
      .style("font-size", isMobile ? "14px" : "12px")
      .style("font-weight", "500")
      .text(d => d.data.name)
      .on("mouseover", function(event, d) {
        // Show tooltip
        const tooltip = d3.select("body").append("div")
          .attr("class", "genealogy-tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0, 0, 0, 0.9)")
          .style("color", "white")
          .style("padding", "8px 12px")
          .style("border-radius", "4px")
          .style("font-size", isMobile ? "14px" : "12px")
          .style("pointer-events", "none")
          .style("z-index", 1000);

        tooltip.html(`
          <strong>${d.data.name}</strong><br/>
          ${d.data.description ? `<em>${d.data.description}</em><br/>` : ''}
          Members: ${d.data.memberCount}<br/>
          Posts: ${d.data.postCount}<br/>
          Direct Descendants: ${d.data.directChildrenCount}<br/>
          Total Descendants: ${d.data.totalDescendantsCount}<br/>
          ${d.data.curatorHandle ? `Ring Host: @${d.data.curatorHandle}` : ''}
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.selectAll(".genealogy-tooltip").remove();
      });

    // Add member/post counts as small badges
    node.append("text")
      .attr("dy", "1.5em")
      .attr("x", 0)
      .style("text-anchor", "middle")
      .style("font-size", isMobile ? "13px" : "11px")
      .style("fill", "#374151")
      .text(d => {
        if (d.data.totalDescendantsCount > 0) {
          return `↓${d.data.totalDescendantsCount}`;
        }
        return '';
      });

    // Initial zoom to fit
    const bounds = g.node()?.getBBox();
    if (bounds) {
      const fullWidth = dimensions.width;
      const fullHeight = dimensions.height;
      const widthScale = fullWidth / bounds.width;
      const heightScale = fullHeight / bounds.height;
      const midX = bounds.x + bounds.width / 2;
      const midY = bounds.y + bounds.height / 2;
      const scale = 0.8 * Math.min(widthScale, heightScale);
      
      const initialTransform = d3.zoomIdentity
        .translate(fullWidth / 2, fullHeight / 2)
        .scale(scale)
        .translate(-midX, -midY);
      
      svg.call(zoom.transform, initialTransform);
    }

  }, [data, dimensions, router]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const container = document.getElementById('genealogy-container');
      if (container) {
        const isMobile = window.innerWidth < 768;
        setDimensions({
          width: container.clientWidth,
          height: Math.min(container.clientHeight, isMobile ? 500 : 800)
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">No genealogy data available</div>
      </div>
    );
  }

  return (
    <div id="genealogy-container" className="w-full h-full">
      {stats && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Ring Hub Network Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 text-sm md:text-base">
            <div>
              <span className="text-gray-700">Total Rings:</span>
              <span className="ml-2 font-semibold text-gray-900">{stats.totalRings.toLocaleString()}</span>
            </div>
            {stats.totalActors !== undefined && (
              <div>
                <span className="text-gray-700">Total Users:</span>
                <span className="ml-2 font-semibold text-gray-900">{stats.totalActors.toLocaleString()}</span>
              </div>
            )}
            <div>
              <span className="text-gray-700">Active Members:</span>
              <span className="ml-2 font-semibold text-gray-900">{stats.totalMembers.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-700">Total Posts:</span>
              <span className="ml-2 font-semibold text-gray-900">{stats.totalPosts.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-700">Max Depth:</span>
              <span className="ml-2 font-semibold text-gray-900">{stats.maxDepth}</span>
            </div>
            <div>
              <span className="text-gray-700">Avg Children:</span>
              <span className="ml-2 font-semibold text-gray-900">{stats.averageChildren.toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-2 text-sm md:text-xs text-gray-700">
        Click on any node to visit the ThreadRing. Scroll to zoom, drag to pan.
      </div>
      
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <svg ref={svgRef}></svg>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm md:text-xs text-gray-700">
        <div className="flex items-center gap-2">
          <span>Node Size = Total Descendants</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span>Color:</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-indigo-500"></span> Root
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-purple-500"></span> 10+ descendants
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-pink-500"></span> 5+ descendants
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span> 1+ descendants
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500"></span> Leaf
          </span>
        </div>
      </div>
    </div>
  );
}