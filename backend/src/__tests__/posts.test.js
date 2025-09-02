import mongoose from 'mongoose'
import { describe, expect, test, beforeEach } from '@jest/globals'

import {
  createPost,
  listAllPosts,
  listPostsByAuthor,
  listPostsByTag,
  getPostById,
  updatePost,
  deletePost,
} from '../services/posts.js'
import { Post } from '../db/models/post.js'
import { User } from '../db/models/user.js'

describe('creating posts', () => {
  let testUser

  beforeEach(async () => {
    await User.deleteMany()
    testUser = await User.create({
      username: 'DanielBugl',
      password: 'Password',
    })
  })

  test('with all parameters should succeed', async () => {
    const post = {
      title: 'Hello Mongoose!',
      contents: 'This post is stored in a MongoDB database using Mongoose.',
      tags: ['mongoose', 'mongodb'],
    }
    const createdPost = await createPost(testUser._id, post)
    expect(createdPost._id).toBeInstanceOf(mongoose.Types.ObjectId)

    const foundPost = await Post.findById(createdPost._id)
    expect(foundPost).toEqual(expect.objectContaining(post))
    expect(foundPost.createdAt).toBeInstanceOf(Date)
    expect(foundPost.updatedAt).toBeInstanceOf(Date)
  })

  test('without title should fail', async () => {
    const post = {
      contents: 'Post with no title.',
      tags: ['empty'],
    }

    try {
      await createPost(testUser._id, post)
    } catch (err) {
      expect(err).toBeInstanceOf(mongoose.Error.ValidationError)
      expect(err.message).toContain('`title` is required')
    }
  })

  test('without author should fail', async () => {
    const post = {
      title: 'Hello Mongoose!',
      contents: 'Post with no author.',
      tags: ['empty'],
    }

    try {
      await createPost(testUser._id, post)
    } catch (err) {
      expect(err).toBeInstanceOf(mongoose.Error.ValidationError)
      expect(err.message).toContain('`author` is required')
    }
  })

  test('with minimal parameters should succeed', async () => {
    const post = {
      title: 'Title',
      author: testUser._id,
    }
    const createdPost = await createPost(testUser._id, post)
    expect(createdPost._id).toBeInstanceOf(mongoose.Types.ObjectId)
  })
})

const sampleUsers = [
  {
    username: 'DanielBugl',
    password: 'full-stack',
  },
  {
    username: 'Joey',
    password: 'Password',
  },
]

const samplePosts = [
  {
    title: 'Learning Redux',
    authorUsername: 'DanielBugl',
    tags: ['redux'],
  },
  {
    title: 'Learn React Hooks',
    authorUsername: 'DanielBugl',
    tags: ['react'],
  },
  {
    title: 'Full-Stack React Projects',
    authorUsername: 'DanielBugl',
    tags: ['react', 'nodejs'],
  },
  {
    title: 'Guide to TypeScript',
    authorUsername: 'Joey',
  },
]

let createdSamplePosts = []
let userMap = {}

beforeEach(async () => {
  await Post.deleteMany({})
  await User.deleteMany({})

  userMap = {}
  for (const user of sampleUsers) {
    const createdUser = new User(user)
    userMap[user.username] = await createdUser.save()
  }

  createdSamplePosts = []
  for (const post of samplePosts) {
    const author = userMap[post.authorUsername]._id
    const createdPost = new Post({ ...post, author })
    createdSamplePosts.push(await createdPost.save())
  }
})

describe('listing posts', () => {
  test('should return all posts', async () => {
    const posts = await listAllPosts()
    expect(posts.length).toEqual(createdSamplePosts.length)
  })

  test('should return posts sorted by creation date descending by default', async () => {
    const posts = await listAllPosts()
    const sortedSamplePosts = createdSamplePosts.sort(
      (a, b) => b.createdAt - a.createdAt,
    )
    expect(posts.map((post) => post.updatedAt)).toEqual(
      sortedSamplePosts.map((post) => post.updatedAt),
    )
  })

  test('should take into account provided sorting options', async () => {
    const posts = await listAllPosts({
      sortBy: 'updatedAt',
      sortOrder: 'ascending',
    })
    const sortedSamplePosts = createdSamplePosts.sort(
      (a, b) => a.updatedAt - b.updatedAt,
    )
    expect(posts.map((post) => post.updatedAt)).toEqual(
      sortedSamplePosts.map((post) => post.updatedAt),
    )
  })

  test('should be able to filter posts by author', async () => {
    const author = userMap['DanielBugl']
    const posts = await listPostsByAuthor(author.username)
    expect(posts.length).toBe(3) // Test that 3 users have this author
    posts.forEach((post) => {
      // Test that each retrieved posts
      expect(post.author._id.toString()).toBe(author._id.toString())
    })
  })

  test('should be able to filter posts by tag', async () => {
    const posts = await listPostsByTag('nodejs')
    expect(posts.length).toBe(1)
  })
})

describe('getting a post', () => {
  test('should return the full post', async () => {
    const post = await getPostById(createdSamplePosts[0]._id)
    expect(post.toObject()).toEqual(createdSamplePosts[0].toObject())
  })

  test('should fail if the id does not exist', async () => {
    const post = await getPostById('000000000000000000000000')
    expect(post).toEqual(null)
  })
})

describe('updating posts', () => {
  test('should update the specified property', async () => {
    const testPost = createdSamplePosts[0]
    await updatePost(testPost.author, testPost._id, {
      title: 'New Title',
    })
    const updatedPost = await Post.findById(testPost._id)
    expect(updatedPost.author.toString()).toEqual(testPost.author.toString())
    expect(updatedPost.title).toEqual('New Title')
  })

  test('should not update other properties', async () => {
    const testPost = createdSamplePosts[0]
    await updatePost(testPost.author, testPost._id, {
      title: 'New TItle',
    })
    const updatedPost = await Post.findById(testPost._id)
    expect(updatedPost.tags).toEqual(testPost.tags)
  })

  test('should update the updatedAt timestamp', async () => {
    const testPost = createdSamplePosts[0]
    await updatePost(testPost.author, testPost._id, {
      title: 'New Title',
    })
    const updatedPost = await Post.findById(testPost._id)
    expect(updatedPost.updatedAt.getTime()).toBeGreaterThan(
      testPost.updatedAt.getTime(),
    )
  })

  test('should fail if the post id does not exist', async () => {
    const testUser = userMap['DanielBugl']
    const post = await updatePost(testUser._id, '000000000000000000000000', {
      title: 'New Title',
    })
    expect(post).toEqual(null)
  })
})

describe('deleting posts', () => {
  test('should remove the post from the database', async () => {
    const testPost = createdSamplePosts[0]
    const result = await deletePost(testPost.author, testPost._id)
    expect(result.deletedCount).toBe(1)
    const deletedPost = await Post.findById(createdSamplePosts[0]._id)
    expect(deletedPost).toEqual(null)
  })

  test('should fail if the post id does not exist', async () => {
    const testUser = userMap['DanielBugl']
    const result = await deletePost(testUser._id, '000000000000000000000000')
    expect(result.deletedCount).toBe(0)
  })
})
