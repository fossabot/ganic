'use strict';
/* eslint-disable no-multi-spaces */

const { Organ } = require('./Organ');
const { OrganLeaf } = require('./OrganLeaf');
const { List, getUtilsByDesc, createNode, buildRelationship, vanishRelationship } = require('./utils');

/**
 * OrganNode is the wrapper for one organ
 * It handles the parent - children relationship things
 * It manages the update of its children
 */

class OrganNode {
  constructor({organ, parent, tree, key, relationship}) {
    this.setUp({organ, parent, tree, key});
    this.update = this.update.bind(this);
    this.vanishChild = this.vanishChild.bind(this);
    this.updateChild = this.updateChild.bind(this);
    this.buildRelationship(relationship);
    organ.addListener(this.update);
  }

  setUp(config) {
    Object.assign(this, {
      organ: null,
      tree: null,
      key: null,

      descs: [],
      descKeys: [],
      children: {},

      parent: null,
      preSibling: null,
      nextSibling: null,
      firstChild: null,
      lastChild: null,
    }, config);
  }

  clearUp() {
    this.setUp();
  }

  update() {
    this.descs = this.parseDescs();
    this.descKeys = this.getDescKeys();
    const childrenKeys = Object.keys(this.children);
    const toVanishKeys = childrenKeys.filter(x => !this.descKeys.includes(x));

    toVanishKeys.forEach(this.vanishChild);
    this.descs.forEach(this.updateChild);
  }

  parseDescs() {
    const descs = Array.isArray(this.organ.result) ? this.organ.result : [this.organ.result];
    return descs.filter(d => d !== undefined).map(desc => 
      !Array.isArray(desc) ? desc : {organism: List, props: desc},
    );
  }

  getDescKeys() {
    return this.descs.map((desc, index) => {
      const hasKey = desc
        && desc.props
        && desc.props.hasOwnProperty('key')
        && desc.props.key !== undefined
        && desc.props.key !== null;
      return hasKey ? String(desc.props.key) : String(index);
    });
  }

  getChildPreSibling(index) {
    const preIndex = index - 1;
    if (preIndex < 0) {
      return null;
    }
    const preKey = this.descKeys[preIndex];
    return this.children[preKey];
  }

  vanishChild(key) {
    if (this.children[key]) {
      this.children[key].vanish();
    }
  }

  vanishAllChildren() {
    const childrenKeys = Object.keys(this.children);
    childrenKeys.forEach(key => this.vanishChild(key));
  }

  updateChild(desc, index) {
    const key = this.descKeys[index];
    const { organism } = getUtilsByDesc(desc, this.tree) || {};
    const isDescLeaf = !organism;

    const child = this.children[key];
    const isChildNode = child instanceof OrganNode;
    const isChildLeaf = child instanceof OrganLeaf;
    if (isChildNode && organism && child.organ.organism === organism) {
      this.relocateChild(child, index);
      child.organ.receive(desc.props); // update existing same type organNode
    } else if (isChildLeaf && isDescLeaf) {
      child.receive(desc);             // update existing organLeaf
    } else {
      this.createChild(desc, index);
    }
  }

  createChild(desc, index) {
    const key = this.descKeys[index];
    this.vanishChild(key);
    const isFirst = index === 0;
    const {node, onReady} = createNode({
      constructors: {
        Organ,
        OrganNode,
        OrganLeaf,
      },

      desc,
      parent: this,
      tree: this.tree,
      key,

      relationship: {
        parent: this,
        isFirst: isFirst,
        isLast: index === this.descKeys.length - 1,
        preSibling: isFirst ? null : this.getChildPreSibling(index),
      },
    });
    if (typeof onReady === 'function') {
      onReady(node);
    }
  }

  relocateChild(child, index) {
    const isFirst = index === 0;
    const preSibling = isFirst ? null : this.getChildPreSibling(index);
    if (child.preSibling !== preSibling) {
      child.vanishRelationship();
      child.buildRelationship({
        parent: this,
        isFirst: index === 0,
        isLast: index === this.descKeys.length - 1,
        preSibling,
      });
      this.tree.envUtils.relocate(child);
    }
  }

  buildRelationship(relationship) {
    buildRelationship(this, relationship);
  }

  vanishRelationship() {
    vanishRelationship(this);
  }

  vanish() {
    this.organ.vanish();
    this.vanishAllChildren();
    this.vanishRelationship();
    this.clearUp();
  }
}

module.exports = {
  OrganNode,
};
