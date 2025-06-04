import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface FamilyNode {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  age: number;
  sex: string;
  bloodGroup: string;
  diseases: string[];
  diseaseCount: number;
  type: string;
  wilaya: string;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

interface FamilyLink {
  source: string | FamilyNode;
  target: string | FamilyNode;
  relation: string;
}

interface GraphData {
  nodes: FamilyNode[];
  links: FamilyLink[];
}

interface FamilyGraphProps {
  data: GraphData | null;
}

interface TooltipData {
  node: FamilyNode;
  x: number;
  y: number;
  visible: boolean;
}

const FamilyGraph: React.FC<FamilyGraphProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData>({
    node: {} as FamilyNode,
    x: 0,
    y: 0,
    visible: false
  });

  const getNodeColor = (type: string, sex: string) => {
    const baseColors = {
      patient: '#3b82f6',
      parent: '#10b981',
      child: '#8b5cf6',
      sibling: '#f59e0b',
      grandparent: '#84cc16',
      grandchild: '#ec4899',
      uncle_aunt: '#06b6d4',
      relative: '#64748b'
    };
    
    const color = baseColors[type as keyof typeof baseColors] || '#64748b';
    
    // Adjust color slightly based on sex
    if (sex === 'F') {
      return d3.rgb(color).brighter(0.2).toString();
    }
    return color;
  };

  const getNodeSize = (type: string) => {
    const sizes = {
      patient: 25,
      parent: 20,
      grandparent: 20,
      child: 18,
      grandchild: 18,
      sibling: 18,
      uncle_aunt: 16,
      relative: 15
    };
    return sizes[type as keyof typeof sizes] || 15;
  };

  const getDiseaseRiskColor = (diseaseCount: number) => {
    if (diseaseCount >= 3) return '#ef4444'; // High risk - red
    if (diseaseCount >= 1) return '#f59e0b'; // Medium risk - amber
    return '#10b981'; // Low risk - green
  };

  const showTooltip = (node: FamilyNode, event: MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltip({
        node,
        x: event.clientX - rect.left + 10,
        y: event.clientY - rect.top - 10,
        visible: true
      });
    }
  };

  const hideTooltip = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    if (!data || !svgRef.current || data.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 600;

    // Clear previous content
    svg.selectAll("*").remove();

    // Create main group
    const container = svg.append("g");

    // Setup zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Create force simulation
    const simulation = d3.forceSimulation<FamilyNode>(data.nodes)
      .force("link", d3.forceLink<FamilyNode, FamilyLink>(data.links)
        .id(d => d.id)
        .distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => getNodeSize(d.type) + 5));

    // Create links
    const link = container.append("g")
      .selectAll<SVGLineElement, FamilyLink>("line")
      .data(data.links)
      .enter().append("line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 2)
      .attr("opacity", 0.6);

    // Create link labels
    const linkLabels = container.append("g")
      .selectAll<SVGTextElement, FamilyLink>("text")
      .data(data.links)
      .enter().append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#64748b")
      .attr("opacity", 0.7)
      .text(d => {
        switch (d.relation) {
          case 'parent-child': return '👨‍👩‍👧‍👦';
          default: return '';
        }
      });

    // Create node groups
    const nodeGroup = container.append("g")
      .selectAll<SVGGElement, FamilyNode>("g")
      .data(data.nodes)
      .enter().append("g")
      .style("cursor", "pointer");

    // Add node circles
    nodeGroup.append("circle")
      .attr("r", d => getNodeSize(d.type))
      .attr("fill", d => getNodeColor(d.type, d.sex))
      .attr("stroke", d => getDiseaseRiskColor(d.diseaseCount))
      .attr("stroke-width", 3)
      .style("filter", "drop-shadow(2px 2px 4px rgba(0,0,0,0.3))");

    // Add gender symbols
    nodeGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "12px")
      .attr("fill", "white")
      .attr("font-weight", "bold")
      .text(d => d.sex === 'M' ? '♂' : '♀');

    // Add node labels (names)
    nodeGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", d => getNodeSize(d.type) + 15)
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .attr("fill", "#1e293b")
      .text(d => d.firstName);

    // Add age labels
    nodeGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", d => getNodeSize(d.type) + 28)
      .attr("font-size", "9px")
      .attr("fill", "#64748b")
      .text(d => `${d.age} ans`);

    // Add disease count indicator
    nodeGroup.filter(d => d.diseaseCount > 0)
      .append("circle")
      .attr("r", 8)
      .attr("cx", d => getNodeSize(d.type) - 5)
      .attr("cy", d => -getNodeSize(d.type) + 5)
      .attr("fill", "#ef4444")
      .attr("stroke", "white")
      .attr("stroke-width", 2);

    nodeGroup.filter(d => d.diseaseCount > 0)
      .append("text")
      .attr("x", d => getNodeSize(d.type) - 5)
      .attr("y", d => -getNodeSize(d.type) + 5)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .text(d => d.diseaseCount);

    // Add mouse events for tooltips
    nodeGroup
      .on("mouseover", function(event, d) {
        d3.select(this).select("circle")
          .transition()
          .duration(200)
          .attr("r", getNodeSize(d.type) + 3)
          .style("filter", "drop-shadow(3px 3px 6px rgba(0,0,0,0.4))");
        
        showTooltip(d, event);
      })
      .on("mouseout", function(event, d) {
        d3.select(this).select("circle")
          .transition()
          .duration(200)
          .attr("r", getNodeSize(d.type))
          .style("filter", "drop-shadow(2px 2px 4px rgba(0,0,0,0.3))");
        
        hideTooltip();
      })
      .on("mousemove", function(event, d) {
        showTooltip(d, event);
      });

    // Add drag behavior
    const drag = d3.drag<SVGGElement, FamilyNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeGroup.call(drag);

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as FamilyNode).x!)
        .attr("y1", d => (d.source as FamilyNode).y!)
        .attr("x2", d => (d.target as FamilyNode).x!)
        .attr("y2", d => (d.target as FamilyNode).y!);

      linkLabels
        .attr("x", d => ((d.source as FamilyNode).x! + (d.target as FamilyNode).x!) / 2)
        .attr("y", d => ((d.source as FamilyNode).y! + (d.target as FamilyNode).y!) / 2);

      nodeGroup
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Center the graph initially
    svg.call(zoom.transform, d3.zoomIdentity.translate(50, 50).scale(0.8));

  }, [data]);

  const getRelationshipDisplayName = (type: string) => {
    const names = {
      patient: 'Patient',
      parent: 'Parent',
      child: 'Enfant',
      sibling: 'Frère/Sœur',
      grandparent: 'Grand-parent',
      grandchild: 'Petit-enfant',
      uncle_aunt: 'Oncle/Tante',
      relative: 'Parent'
    };
    return names[type as keyof typeof names] || 'Parent';
  };

  return (
    <div className="h-full relative">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Arbre généalogique médical</h2>
        <p className="text-sm text-gray-500">
          Visualisation des relations familiales et prédispositions médicales
        </p>
      </div>
      
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 h-[600px] relative overflow-hidden">
        {data && data.nodes.length > 0 ? (
          <>
            {/* Legend */}
            <div className="absolute top-4 right-4 bg-white bg-opacity-95 p-3 rounded-lg shadow-lg border border-gray-200 z-10 max-w-xs">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Légende</h3>
              <div className="space-y-1 text-xs">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-blue-500 mr-2 border-2 border-green-500"></div>
                  <span>Patient principal</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <span>Parents</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                  <span>Enfants</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                  <span>Frères/Sœurs</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="text-xs text-gray-600 mb-1">Bordures (risque):</div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-white border-2 border-red-500 mr-2"></div>
                    <span>Élevé (3+ maladies)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-white border-2 border-amber-500 mr-2"></div>
                    <span>Modéré (1-2 maladies)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-white border-2 border-green-500 mr-2"></div>
                    <span>Faible (aucune)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-90 text-white p-2 rounded text-xs">
              <div>🖱️ Glisser pour déplacer • 🔍 Molette pour zoomer • 👆 Survoler pour détails</div>
            </div>

            {/* SVG Graph */}
            <svg 
              ref={svgRef} 
              width="100%" 
              height="100%" 
              className="overflow-visible"
            />

            {/* Tooltip */}
            {tooltip.visible && (
              <div 
                className="absolute bg-gray-900 text-white p-3 rounded-lg shadow-xl z-20 max-w-xs pointer-events-none"
                style={{ 
                  left: tooltip.x, 
                  top: tooltip.y,
                  transform: tooltip.x > 400 ? 'translateX(-100%)' : undefined
                }}
              >
                <div className="font-semibold text-sm mb-2 border-b border-gray-600 pb-2">
                  {tooltip.node.firstName} {tooltip.node.lastName}
                </div>
                
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Relation:</span>
                    <span className="font-medium">{getRelationshipDisplayName(tooltip.node.type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Âge:</span>
                    <span>{tooltip.node.age} ans</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Sexe:</span>
                    <span>{tooltip.node.sex === 'M' ? 'Masculin' : 'Féminin'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Groupe sanguin:</span>
                    <span>{tooltip.node.bloodGroup}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Wilaya:</span>
                    <span>{tooltip.node.wilaya}</span>
                  </div>
                </div>

                {tooltip.node.diseases.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-600">
                    <div className="text-xs text-gray-300 mb-1">Maladies diagnostiquées:</div>
                    <div className="space-y-1">
                      {tooltip.node.diseases.map((disease, index) => (
                        <div key={index} className="flex items-center text-xs">
                          <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                          <span>{disease}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tooltip.node.diseases.length === 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-600">
                    <div className="flex items-center text-xs text-green-400">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      <span>Aucune maladie diagnostiquée</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-400 text-4xl mb-4">👨‍👩‍👧‍👦</div>
              <p className="text-gray-500 text-lg">Aucune donnée familiale disponible</p>
              <p className="text-gray-400 text-sm mt-2">
                Les relations familiales apparaîtront ici une fois disponibles
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FamilyGraph;